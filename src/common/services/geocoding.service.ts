import { Injectable, InternalServerErrorException } from "@nestjs/common";
import axios from 'axios';

@Injectable()
export class GeocodingService{
    private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    
    async getCoordinates(address:string, city:string):Promise<{latitude: number, longitude: number} | null>{
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        try{
            const fullAddress = `${address}, ${city}`;
            const respose = await axios.get (this.baseUrl,{
                params:{
                    address: fullAddress,
                    key: apiKey
                }
            });
            if(respose.data.status === 'OK' && respose.data.results.length > 0){
                const location = respose.data.results[0].geometry.location;
                return {
                    latitude: location.lat,
                    longitude: location.lng
                };

            }
            return null;
            
        }catch(error){
            console.error('Error fetching geocoding data:', error);
                return null;
        }
    }
}