import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import Model from '../../model/model.module';
import { Buildings } from '../../buildings/entities/building.entity';
import { FileUpload } from 'src/modules/file-upload/entities/file-upload.entity';
import { Users } from 'src/modules/users/entities/user.entity';
import {Caisher} from "../../caisher/entities/caisher.entity";

@Entity('Towns')
export class Towns extends Model {
  @Column()
  name: string;

  @Column()
  region_id: number;

  @Column()
  district_id: number;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  contact_number: string;

  @Column({ nullable: true })
  logo: string;

  @OneToMany((type) => Buildings, (building) => building.towns)
  buildings: Buildings[];

  @OneToOne((type) => FileUpload, (fileUpload) => fileUpload.town, {onDelete: "SET NULL", onUpdate: "CASCADE"})
  @JoinColumn({ name: 'file_id' })
  file: FileUpload;

  @Column({ nullable: true })
  file_id: number;

  @ManyToOne((type) => Users, (users) => users.towns)
  @JoinColumn({ name: 'users_id' })
  user: Users;

  @OneToMany((type)=>Caisher,(caisher)=>{caisher.towns})
  caisher:Caisher;
}
