import { Column, Entity, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { District } from '../../district/entities/district.entity';

@Entity('Regions')
export class Regions extends Model {
  @Column()
  name: string;

  @OneToMany((type) => District, (district) => district.region)
  district: District[];

  public toString(): string {
    return `Rectangle[width=${this.name}]`;
  }
}
