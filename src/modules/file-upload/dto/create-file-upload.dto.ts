import { ApiProperty } from "@nestjs/swagger";

export class LocalFileDto {
    filename: string;
    path: string;
    mimetype: string;
}
