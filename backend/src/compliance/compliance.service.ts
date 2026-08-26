import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  findAllCertificates(vesselId?: string) {
    return this.prisma.vesselCertificate.findMany({
      where: vesselId ? { vesselId } : undefined,
      include: { vessel: { select: { id: true, name: true, imoNumber: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  createCertificate(data: {
    vesselId: string;
    certificateName: string;
    certificateNumber?: string;
    issuingAuthority?: string;
    issueDate?: string;
    expiryDate: string;
  }) {
    return this.prisma.vesselCertificate.create({
      data: {
        ...data,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: new Date(data.expiryDate),
      },
      include: { vessel: true },
    });
  }

  updateCertificate(id: string, data: any) {
    return this.prisma.vesselCertificate.update({
      where: { id },
      data: {
        ...data,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
    });
  }

  getAlerts(isRead?: boolean) {
    return this.prisma.alert.findMany({
      where: isRead !== undefined ? { isRead } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  markAlertRead(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async checkExpiringCertificates() {
    const today = new Date();
    const warningDate = new Date(today);
    warningDate.setDate(today.getDate() + 30);

    const expiringCerts = await this.prisma.vesselCertificate.findMany({
      where: {
        expiryDate: { lte: warningDate },
        status: { not: 'EXPIRED' },
      },
      include: { vessel: true },
    });

    const alerts: any[] = [];
    for (const cert of expiringCerts) {
      const daysUntilExpiry = Math.ceil(
        (cert.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isExpired = daysUntilExpiry <= 0;
      const severity = isExpired ? 'CRITICAL' : daysUntilExpiry <= 7 ? 'CRITICAL' : 'WARNING';

      // Update cert status
      await this.prisma.vesselCertificate.update({
        where: { id: cert.id },
        data: { status: isExpired ? 'EXPIRED' : 'EXPIRING_SOON' },
      });

      // Check if alert already exists for this cert
      const existingAlert = await this.prisma.alert.findFirst({
        where: {
          referenceId: cert.id,
          type: 'CERTIFICATE_EXPIRY',
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) },
        },
      });

      if (!existingAlert) {
        const alert = await this.prisma.alert.create({
          data: {
            type: 'CERTIFICATE_EXPIRY',
            title: `⚠️ Certificate ${isExpired ? 'EXPIRED' : 'Expiring Soon'}: ${cert.certificateName}`,
            message: `${cert.vessel.name} - "${cert.certificateName}" ${isExpired ? 'expired' : `expires in ${daysUntilExpiry} day(s)`} on ${cert.expiryDate.toDateString()}.`,
            severity,
            referenceId: cert.id,
            referenceType: 'VesselCertificate',
          },
        });
        alerts.push(alert);
      }
    }

    console.log(`🔔 Compliance check: ${alerts.length} new alert(s) created`);
    return alerts;
  }

  async getExpiryStats() {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const [total, valid, expiringSoon, expired] = await Promise.all([
      this.prisma.vesselCertificate.count(),
      this.prisma.vesselCertificate.count({ where: { status: 'VALID' } }),
      this.prisma.vesselCertificate.count({ where: { status: 'EXPIRING_SOON' } }),
      this.prisma.vesselCertificate.count({ where: { status: 'EXPIRED' } }),
    ]);

    return { total, valid, expiringSoon, expired };
  }
}
