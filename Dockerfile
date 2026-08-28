FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    fastapi==0.116.1 \
    uvicorn[standard]==0.35.0 \
    psycopg[binary]==3.2.9 \
    pydantic==2.11.7 \
    jinja2 \
    python-multipart

# Copy application code
COPY ./app /app

# Create reports directory
RUN mkdir -p /app/reports

# Expose port
EXPOSE 8080

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
