# OCR toolbox for the PYQ scraper. Build:
#   docker build -t prashnottar-ocr scraper/docker
# Run (see scraper/ocr.py):
#   docker run --rm --memory=1500m -v "$PWD/scraper:/work" prashnottar-ocr ocrmypdf ...
FROM debian:trixie-slim
ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-hin tesseract-ocr-eng poppler-utils ocrmypdf \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /work
