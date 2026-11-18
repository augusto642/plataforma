import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class CreateKnowledgeReferenceDto {
  @IsIn(['job', 'course', 'book', 'pdf'])
  kind!: 'job' | 'course' | 'book' | 'pdf';

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(512)
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: true, disallow_auth: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  license?: string;
}

export class ReviewKnowledgeReferenceDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';
}

export class PublishKnowledgeReferenceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[a-z0-9][a-z0-9_-]{0,63}$/, { each: true })
  topics!: string[];

  @IsBoolean()
  licenseReviewed!: boolean;
}
