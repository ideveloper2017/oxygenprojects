import { ApiProperty } from "@nestjs/swagger";

export class FileDto {
    image_id:number
    entity: string;
    record_id: number
    filename: string;
    path: string;
    mimetype: string;
}