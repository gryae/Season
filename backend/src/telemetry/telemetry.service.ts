import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Realistic sea routes for 3 dummy vessels
const VESSEL_ROUTES = {
  vessel1: [
    { lat: 1.2655, lng: 103.8201 }, // Singapore
    { lat: 1.3521, lng: 103.8198 },
    { lat: 1.4303, lng: 103.7890 },
    { lat: 1.5100, lng: 103.7600 },
    { lat: 1.5900, lng: 103.7200 },
    { lat: 1.6500, lng: 103.6800 },
    { lat: 1.7000, lng: 103.6200 },
  ],
  vessel2: [
    { lat: 3.1390, lng: 101.6869 }, // Kuala Lumpur coast
    { lat: 3.2000, lng: 101.7500 },
    { lat: 3.2800, lng: 101.8200 },
    { lat: 3.3500, lng: 101.9000 },
    { lat: 3.4100, lng: 101.9800 },
    { lat: 3.4700, lng: 102.0500 },
    { lat: 3.5200, lng: 102.1200 },
  ],
  vessel3: [
    { lat: 5.4141, lng: 100.3288 }, // Penang
    { lat: 5.4800, lng: 100.3900 },
    { lat: 5.5500, lng: 100.4500 },
    { lat: 5.6100, lng: 100.5100 },
    { lat: 5.6600, lng: 100.5700 },
    { lat: 5.7000, lng: 100.6300 },
    { lat: 5.7400, lng: 100.7000 },
  ],
};

@Injectable()
export class TelemetryService {
  private routeIndexes: Record<string, number> = {
    vessel1: 0,
    vessel2: 0,
    vessel3: 0,
  };

  constructor(private prisma: PrismaService) {}

  async getLiveLocations() {
    const vessels = await this.prisma.vessel.findMany({
      include: {
        telemetries: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    return vessels.map((vessel) => ({
      id: vessel.id,
      name: vessel.name,
      imoNumber: vessel.imoNumber,
      vesselType: vessel.vesselType,
      status: vessel.status,
      currentRunHours: vessel.currentRunHours,
      latitude: vessel.telemetries[0]?.latitude ?? 0,
      longitude: vessel.telemetries[0]?.longitude ?? 0,
      speed: vessel.telemetries[0]?.speed ?? 0,
      heading: vessel.telemetries[0]?.heading ?? 0,
      lastUpdate: vessel.telemetries[0]?.timestamp ?? null,
    }));
  }

  async getTelemetryHistory(vesselId: string, limit = 20) {
    return this.prisma.telemetry.findMany({
      where: { vesselId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async seedDummyGpsData() {
    const vessels = await this.prisma.vessel.findMany();

    for (const vessel of vessels) {
      const routeKey = `vessel${vessels.indexOf(vessel) + 1}` as keyof typeof VESSEL_ROUTES;
      const route = VESSEL_ROUTES[routeKey] || VESSEL_ROUTES.vessel1;

      const idx = this.routeIndexes[routeKey] ?? 0;
      const point = route[idx % route.length];

      // Add small random drift for realism
      const latDrift = (Math.random() - 0.5) * 0.005;
      const lngDrift = (Math.random() - 0.5) * 0.005;

      const speed = 8 + Math.random() * 6; // 8-14 knots
      const heading = Math.random() * 360;

      await this.prisma.telemetry.create({
        data: {
          vesselId: vessel.id,
          latitude: point.lat + latDrift,
          longitude: point.lng + lngDrift,
          speed: parseFloat(speed.toFixed(2)),
          heading: parseFloat(heading.toFixed(1)),
          runHours: vessel.currentRunHours,
        },
      });

      // Increment run_hours (0.02 per minute = ~1.2 per hour, realistic)
      const hoursIncrement = 0.02;
      await this.prisma.vessel.update({
        where: { id: vessel.id },
        data: { currentRunHours: { increment: hoursIncrement } },
      });

      // Advance route index
      this.routeIndexes[routeKey] = (idx + 1) % route.length;
    }

    console.log(`🛰️ Telemetry seeded at ${new Date().toISOString()}`);
  }
}
