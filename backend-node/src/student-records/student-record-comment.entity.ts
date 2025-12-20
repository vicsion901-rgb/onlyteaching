import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('student_record_comments')
  export class StudentRecordComment {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    category: string;
  
    @Column()
    subcategory: string;
  
    @Column()
    attribute: string;
  
    @Column('text')
    content: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }