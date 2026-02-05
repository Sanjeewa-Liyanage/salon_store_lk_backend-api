import { Injectable, RequestMethod } from '@nestjs/common';
import { DiscoveryService, Reflector, MetadataScanner } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Controller } from '@nestjs/common/interfaces';

export interface RouteInfo {
  path: string;
  method: string;
  controller: string;
  handler: string;
}

@Injectable()
export class PlaygroundService {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly scanner: MetadataScanner,
  ) {}

  getRoutes(): RouteInfo[] {
    const controllers = this.discovery.getControllers();
    const routes: RouteInfo[] = [];

    controllers.forEach((wrapper) => {
      const { instance, metatype } = wrapper;

      if (!instance || !metatype) {
        return;
      }

      // Get Controller Path prefix
      const controllerPath = this.reflector.get<string | string[]>(PATH_METADATA, metatype);
      const basePath = this.normalizePath(controllerPath);

      const methodNames = this.scanner.getAllMethodNames(Object.getPrototypeOf(instance));

      methodNames.forEach((methodName) => {
        const methodRef = instance[methodName];
        
        const methodPath = this.reflector.get<string | string[]>(PATH_METADATA, methodRef);
        const requestMethod = this.reflector.get<number>(METHOD_METADATA, methodRef);

        if (requestMethod !== undefined) {
          // Concatenate paths
          let fullPath = basePath + this.normalizePath(methodPath);
          
          // FIX: Global replace to remove double slashes (e.g., "//firebase/test" -> "/firebase/test")
          fullPath = fullPath.replace(/\/+/g, '/');

          const httpMethod = this.mapRequestMethod(requestMethod);

          routes.push({
            path: fullPath || '/',
            method: httpMethod,
            controller: metatype.name,
            handler: methodName,
          });
        }
      });
    });

    return routes;
  }

  private normalizePath(path: string | string[] | undefined): string {
    if (!path) return '';
    if (Array.isArray(path)) path = path[0];
    return path.startsWith('/') ? path : '/' + path;
  }

  private mapRequestMethod(method: number): string {
    switch (method) {
      case RequestMethod.GET: return 'GET';
      case RequestMethod.POST: return 'POST';
      case RequestMethod.PUT: return 'PUT';
      case RequestMethod.DELETE: return 'DELETE';
      case RequestMethod.PATCH: return 'PATCH';
      case RequestMethod.OPTIONS: return 'OPTIONS';
      case RequestMethod.HEAD: return 'HEAD';
      case RequestMethod.ALL: return 'ALL';
      default: return 'GET';
    }
  }
}