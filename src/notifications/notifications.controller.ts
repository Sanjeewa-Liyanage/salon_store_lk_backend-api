import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(private notificationsService: NotificationsService) {}

    @Get()
    async findAllForCurrentUser(@Req() req: any, @Query() query: QueryNotificationsDto) {
        return this.notificationsService.findAllForUser(req.user.sub, query);
    }

    @Get('unread-count')
    async getUnreadCount(@Req() req: any) {
        return this.notificationsService.getUnreadCount(req.user.sub);
    }

    @Patch(':id/read')
    async markAsRead(@Req() req: any, @Param('id') id: string) {
        return this.notificationsService.markAsRead(id, req.user.sub);
    }

    @Patch('read-all')
    async markAllAsRead(@Req() req: any) {
        return this.notificationsService.markAllAsRead(req.user.sub);
    }
}
