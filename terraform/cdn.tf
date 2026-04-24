# S3 Bucket for image uploads + CloudFront CDN distribution
# Usage: terraform apply -target=aws_s3_bucket.uploads -target=aws_cloudfront_distribution.cdn

# ─── S3 Bucket ───────────────────────────────────────────
resource "aws_s3_bucket" "uploads" {
  bucket = "gonok-uploads"

  tags = {
    Name    = "gonok-uploads"
    Project = "gonok"
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    max_age_seconds = 86400
  }
}

# ─── CloudFront Origin Access Control ────────────────────
resource "aws_cloudfront_origin_access_control" "uploads" {
  name                              = "gonok-uploads-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─── S3 Bucket Policy (CloudFront read-only access) ─────
resource "aws_s3_bucket_policy" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.uploads.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}

# ─── CloudFront Distribution ────────────────────────────
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Gonok image CDN"
  default_root_object = ""
  price_class         = "PriceClass_200" # US, Europe, Asia (includes India/Bangladesh)

  origin {
    domain_name              = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_id                = "S3-gonok-uploads"
    origin_access_control_id = aws_cloudfront_origin_access_control.uploads.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-gonok-uploads"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    origin_request_policy_id = "88a5eaf4-2f7a-4afa-9884-6ad5dc5ed9f5" # CORS-S3Origin
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name    = "gonok-cdn"
    Project = "gonok"
  }
}

# ─── IAM User for API uploads ────────────────────────────
resource "aws_iam_user" "api_uploader" {
  name = "gonok-api-uploader"

  tags = {
    Project = "gonok"
  }
}

resource "aws_iam_user_policy" "api_uploader" {
  name = "gonok-s3-upload"
  user = aws_iam_user.api_uploader.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowUploadAndDelete"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}

# ─── Outputs ─────────────────────────────────────────────
output "s3_bucket_name" {
  value       = aws_s3_bucket.uploads.id
  description = "S3 bucket name for image uploads"
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront domain — set this as AWS_CLOUDFRONT_DOMAIN in .env.prod"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.cdn.id
  description = "CloudFront distribution ID"
}
