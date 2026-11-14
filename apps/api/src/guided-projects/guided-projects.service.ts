import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GiteaService } from '../gitea/gitea.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ProjectPrerequisite {
  id: string;
  title: string;
  completed?: boolean;
}

@Injectable()
export class GuidedProjectsService {
  private readonly logger = new Logger(GuidedProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gitea: GiteaService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultProject();
  }

  async seedDefaultProject() {
    try {
      const existing = await (this.prisma as any).guidedProject.findUnique({
        where: { slug: 'sistema-imobiliario-fullstack-devops' },
      });

      if (!existing) {
        this.logger.log('Seeding initial Guided Project: Sistema Imobiliário Full Stack & DevOps');
        const project = await (this.prisma as any).guidedProject.create({
          data: {
            title: 'Sistema Imobiliário Full Stack & DevOps',
            slug: 'sistema-imobiliario-fullstack-devops',
            description:
              'Desenvolva um sistema completo de gestão imobiliária profissional com microsserviços, pipeline CI/CD no Jenkins, validação estrita no SonarQube e deploy em containers Docker.',
            level: 'junior',
            prerequisites: [
              { id: 'logic', title: 'Fundamentos de Algoritmos e Lógica de Programação', required: true },
              { id: 'java-poo', title: 'Programação Orientada a Objetos em Java', required: true },
              { id: 'sql-relational', title: 'Bancos de Dados Relacionais & Modelagem SQL', required: true },
              { id: 'git-flow', title: 'Git Básico e Boas Práticas de Branching', required: true },
            ],
            techStack: [
              'Java',
              'Spring Boot',
              'Spring Data',
              'PostgreSQL',
              'React',
              'REST API',
              'Docker',
              'Jenkins',
              'SonarQube',
            ],
            giteaTemplateRepo: 'template-imobiliaria',
            sonarProjectKey: 'sistema-imobiliario',
            order: 1,
            sprints: {
              create: [
                {
                  order: 1,
                  title: 'Sprint 1: API REST Spring Boot & Modelagem PostgreSQL',
                  description: 'Crie os endpoints de imóveis, proprietários e contratos com migrations seguras.',
                  baseXp: 300,
                  tasks: [
                    'Configurar Spring Boot 3 + Spring Data JPA',
                    'Implementar migrations com Flyway/Liquibase',
                    'CRUD de Imóveis com validação Bean Validation (Jakarta)',
                  ],
                },
                {
                  order: 2,
                  title: 'Sprint 2: Interface em React & Integração REST',
                  description: 'Desenvolva o dashboard de listagem, filtros por preço/bairro e formulário de cadastro.',
                  baseXp: 350,
                  tasks: [
                    'Setup do frontend React com Vite/Tailwind',
                    'Consumo de API REST com tratamento de erros',
                    'Validação de formulários no cliente',
                  ],
                },
                {
                  order: 3,
                  title: 'Sprint 3: Docker Compose & Pipeline CI Jenkins',
                  description: 'Containerize o banco, a API e o front; crie o Jenkinsfile automatizado.',
                  baseXp: 400,
                  tasks: [
                    'Dockerfile multi-stage para Java e React',
                    'docker-compose.yml orquestrando banco, backend e frontend',
                    'Jenkinsfile disparando build e testes automáticos no commit',
                  ],
                },
                {
                  order: 4,
                  title: 'Sprint 4: SonarQube Quality Gate & Clean Code',
                  description: 'Alcance rating A em Manutenibilidade e 80%+ de cobertura de testes unitários.',
                  baseXp: 500,
                  tasks: [
                    'Testes unitários e de integração com JUnit 5 e Mockito',
                    'Análise estática do SonarQube sem vulnerabilidades',
                    'Aprovação final do Quality Gate para pontuação máxima',
                  ],
                },
              ],
            },
          },
        });
        this.logger.log(`Created guided project ${project.id}`);
      }
    } catch (err) {
      // Tolerância caso a migração ainda não tenha subido no banco do docker
      this.logger.warn(`Could not seed guided project: ${(err as Error).message}`);
    }
  }

  async listProjects(userId?: string) {
    try {
      const projects = await (this.prisma as any).guidedProject.findMany({
        orderBy: { order: 'asc' },
        include: {
          sprints: { orderBy: { order: 'asc' } },
          userProgress: userId ? { where: { userId } } : false,
        },
      });

      return projects.map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        level: p.level,
        prerequisites: p.prerequisites,
        techStack: p.techStack,
        sprintsCount: p.sprints?.length || 0,
        sprints: p.sprints,
        userProgress: p.userProgress?.[0] || null,
      }));
    } catch (err) {
      this.logger.warn(`listProjects error: ${(err as Error).message}`);
      return [];
    }
  }

  async getProjectBySlug(slug: string, userId?: string) {
    const project = await (this.prisma as any).guidedProject.findUnique({
      where: { slug },
      include: {
        sprints: { orderBy: { order: 'asc' } },
        userProgress: userId ? { where: { userId } } : false,
      },
    });

    if (!project) throw new NotFoundException('Projeto guiado não encontrado');

    return {
      ...project,
      userProgress: project.userProgress?.[0] || null,
    };
  }

  async checkPrerequisites(userId: string, projectId: string): Promise<{ canStart: boolean; checklist: any[] }> {
    const project = await (this.prisma as any).guidedProject.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Projeto guiado não encontrado');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, xp: true },
    });

    // Se o aluno tem nível >= 2 ou mais de 200 XP, consideramos os conceitos básicos atendidos
    const isExperienced = (user?.level ?? 1) >= 2 || (user?.xp ?? 0) >= 200;

    const prereqs = (project.prerequisites as any[]) || [];
    const checklist = prereqs.map((pr) => ({
      ...pr,
      completed: isExperienced,
    }));

    return {
      canStart: checklist.every((c) => c.completed),
      checklist,
    };
  }

  async startProject(userId: string, projectId: string) {
    const project = await (this.prisma as any).guidedProject.findUnique({
      where: { id: projectId },
      include: { sprints: { orderBy: { order: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Projeto guiado não encontrado');

    // Valida pré-requisitos
    const { canStart } = await this.checkPrerequisites(userId, projectId);
    if (!canStart) {
      throw new BadRequestException('Você precisa atender a todos os pré-requisitos antes de iniciar este projeto.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const giteaUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
    const repoName = `${project.slug}-${giteaUsername}`;

    // Provisiona repositório no Gitea ou simula caso Gitea esteja em setup
    let repoUrl = `http://localhost:3030/${giteaUsername}/${repoName}.git`;
    try {
      const giteaRes = await this.gitea.generateRepoFromTemplate({
        templateOwner: 'plataforma',
        templateRepo: project.giteaTemplateRepo || 'template-imobiliaria',
        newOwner: giteaUsername,
        name: repoName,
        description: `Projeto Guiado Nexus Code: ${project.title}`,
        isPrivate: false,
      });
      if (giteaRes?.clone_url) repoUrl = giteaRes.clone_url;
    } catch (err) {
      this.logger.warn(`Could not fork template in Gitea, using fallback URL: ${(err as Error).message}`);
    }

    // Registra o progresso do usuário no banco
    const progress = await (this.prisma as any).userGuidedProjectProgress.upsert({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      create: {
        userId,
        projectId,
        currentSprint: 1,
        status: 'in_progress',
        giteaRepoName: repoName,
      },
      update: {
        giteaRepoName: repoName,
      },
    });

    return {
      success: true,
      repoName,
      repoUrl,
      currentSprint: progress.currentSprint,
      sprints: project.sprints,
    };
  }
}
