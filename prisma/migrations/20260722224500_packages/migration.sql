-- CreateTable
CREATE TABLE "package" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'label_created',
    "estimatedDeliveryAt" TIMESTAMP(3),
    "destination" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "events" JSONB NOT NULL DEFAULT '[]',
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "package_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_userId_carrier_trackingNumber_key" ON "package"("userId", "carrier", "trackingNumber");

-- CreateIndex
CREATE INDEX "package_userId_status_idx" ON "package"("userId", "status");

-- CreateIndex
CREATE INDEX "package_userId_estimatedDeliveryAt_idx" ON "package"("userId", "estimatedDeliveryAt");

-- AddForeignKey
ALTER TABLE "package" ADD CONSTRAINT "package_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
