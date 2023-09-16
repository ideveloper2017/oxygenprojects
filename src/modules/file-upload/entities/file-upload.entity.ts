import { Apartments } from 'src/modules/apartments/entities/apartment.entity';
import { Buildings } from 'src/modules/buildings/entities/building.entity';
import { Towns } from 'src/modules/towns/entities/town.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('FileUpload')
export class FileUpload {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  filename: string;

  @Column() 
  path: string;

  @Column()
  mimetype: string;

  @ManyToOne(() => Apartments, apartment => apartment.files)
  @JoinColumn({name: 'apartment_id'})
  apartment : Apartments

  @Column({nullable : true})
  apartment_id: number

  @ManyToOne(() => Buildings, building => building.files)
  @JoinColumn({name: "building_id"})
  building: Buildings
  
  @Column({nullable: true})
  building_id: number 


  @ManyToOne(() => Towns, town => town.files)
  @JoinColumn({name: "town_id"})
  town: Towns

  @Column({nullable: true})
  town_id: number
  
}
