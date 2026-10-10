import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

const globalForS3 = globalThis as typeof globalThis & {
  s3Client?: S3Client;
};

export function getS3BucketName() {
  const bucketName = process.env.AWS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("A variável de ambiente AWS_BUCKET_NAME não está configurada.");
  }

  return bucketName;
}

export function getS3Client() {
  if (!globalForS3.s3Client) {
    globalForS3.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-2",
    });
  }

  return globalForS3.s3Client;
}
