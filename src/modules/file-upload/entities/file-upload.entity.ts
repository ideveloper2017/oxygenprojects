import { Apartments } from 'src/modules/apartments/entities/apartment.entity';
import { Buildings } from 'src/modules/buildings/entities/building.entity';
import { Towns } from 'src/modules/towns/entities/town.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

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

  @ManyToOne(() => Apartments, apartment => apartment.files, { 
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
    createForeignKeyConstraints: true
  })
  @JoinColumn({ name: 'apartment_id' })
  @Index()
  apartment: Apartments;

  @Column({ nullable: true })
  apartment_id: number | null;

  @ManyToOne(() => Buildings, building => building.files, { 
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
    createForeignKeyConstraints: true
  })
  @JoinColumn({ name: 'building_id' })
  @Index()
  building: Buildings;
  
  @Column({ nullable: true })
  building_id: number | null;

  @ManyToOne(() => Towns, town => town.files, { 
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
    createForeignKeyConstraints: true
  })
  @JoinColumn({ name: 'town_id' })
  @Index()
  town: Towns;

  @Column({ nullable: true })
  town_id: number | null;
  
}
