# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file first (for caching purposes)
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application into /app
COPY . /app/

# Set the command to run your application
CMD ["python", "/app/bike_planner_v_0.1.py"]
# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file first (for caching purposes)
COPY requirements-prod.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy the rest of your application into /app
COPY . /app/

EXPOSE 5000

# Set the command to run your application
CMD ["python", "/app/bike_planner_v_0.1.py"]

