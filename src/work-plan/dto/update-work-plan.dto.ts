import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkPlanDto } from './create-work-plan.dto';

export class UpdateWorkPlanDto extends PartialType(CreateWorkPlanDto) {}
