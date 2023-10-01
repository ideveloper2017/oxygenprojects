import { ApiProperty } from "@nestjs/swagger";

export class FileDto {
    entity: string;
    record_id: number
    filename: string;
    path: string;
    mimetype: string;
    image_id:number;
    file_id?:number;
}