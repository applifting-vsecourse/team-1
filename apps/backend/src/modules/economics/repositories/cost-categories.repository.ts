import { PrismaService } from "@/core/prisma/prisma.service"
import { CostCategory } from "@/modules/economics/domain/cost-category"
import { Injectable } from "@nestjs/common"

@Injectable()
export class CostCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrganization(organizationId: string): Promise<CostCategory[]> {
    return this.prisma.costCategory.findMany({
      where: { organizationId },
      select: { id: true, defaultKey: true, name: true, position: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    })
  }
}
