import { Apartments } from 'src/modules/apartments/entities/apartment.entity';
import { Buildings } from 'src/modules/buildings/entities/building.entity';
import { Towns } from 'src/modules/towns/entities/town.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

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

  @OneToOne(() => Apartments, apartment => apartment.file, {onDelete: 'CASCADE', onUpdate:"CASCADE"})
  @JoinColumn({name: 'apartment_id'})
  apartment : Apartments

  @Column({nullable : true})
  apartment_id: number

  @OneToOne(() => Buildings, building => building.file, {onDelete: 'CASCADE', onUpdate: "CASCADE"})
  @JoinColumn({name: "building_id",})
  building: Buildings
  
  @Column({nullable: true})
  building_id: number 


  @OneToOne(() => Towns, town => town.file, {onDelete: 'CASCADE', onUpdate: "CASCADE"})
  @JoinColumn({name: "town_id"})
  town: Towns

  @Column({nullable: true})
  town_id: number
  
}
