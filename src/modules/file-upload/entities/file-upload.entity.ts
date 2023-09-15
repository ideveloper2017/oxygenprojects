import { ApiProperty } from "@nestjs/swagger";
import { Apartments } from "src/modules/apartments/entities/apartment.entity";
import { Buildings } from "src/modules/buildings/entities/building.entity";
import Model from "src/modules/model/model.module";
import { Towns } from "src/modules/towns/entities/town.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";


@Entity('FileUpload')
export class FileUpload extends Model {

    @ApiProperty({example: "file.png"})
    @Column()
    name: string;

    @Column('bytea')
    content: Buffer;

    
    @ManyToOne(() => Towns, towns => towns.files)
    @JoinColumn({name: "town_id"})
    town: Towns

    @Column({nullable: true})
    town_id: number
    
    @ManyToOne(() => Buildings, buildings => buildings.files)
    @JoinColumn({name: "building_id"})
    building: Buildings

    @Column({nullable: true})
    building_id: number
    
    @ManyToOne(() => Apartments, apartments => apartments.files)
    @JoinColumn({name: "aparment_id"})
    apartment: Apartments
    
    @Column({nullable: true})
    apartment_id: number
} 
