import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { labelPath: true, orderNumber: true, id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!order.labelPath) {
    return NextResponse.json(
      { error: "No label generated for this order" },
      { status: 404 }
    );
  }

  try {
    const absolutePath = join(process.cwd(), order.labelPath);
    const fileBuffer = await readFile(absolutePath);
    const fileName = `${order.orderNumber ?? order.id}.pdf`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Label file not found on disk" },
      { status: 404 }
    );
  }
}
