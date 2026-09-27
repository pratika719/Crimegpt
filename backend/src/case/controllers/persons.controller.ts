import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PersonService } from '../services/person.service';
import { CreatePersonDto } from '../dto/create-person.dto';
import { UpdatePersonDto } from '../dto/update-person.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('persons')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cases/:caseId/persons')
export class PersonsController {
  constructor(private readonly personService: PersonService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a person to a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 201, description: 'Person added successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePersonDto,
  ) {
    return this.personService.createPerson(caseId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all persons in a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'List of persons' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.personService.getPersonsByCaseId(caseId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get person by ID' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Person ID' })
  @ApiResponse({ status: 200, description: 'Person details' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.personService.getPersonById(id, userId, caseId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update person details' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Person ID' })
  @ApiResponse({ status: 200, description: 'Person updated successfully' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.personService.updatePerson(id, userId, dto, caseId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove person from case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'id', description: 'Person ID' })
  @ApiResponse({ status: 200, description: 'Person removed successfully' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(
    @Param('caseId') caseId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.personService.deletePerson(id, userId, caseId);
  }
}
