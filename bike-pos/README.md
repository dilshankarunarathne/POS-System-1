# Bike Parts POS System

A comprehensive Point of Sale (POS) system designed specifically for bike spare parts shops. This application helps manage inventory, process sales, generate reports, and more.

## Features

- **User Authentication**

  - Role-based access control (Admin, Manager, Cashier)
  - Secure login with JWT

- **Dashboard**

  - Sales overview with charts and statistics
  - Low stock alerts
  - Recent sales activity

- **Point of Sale (POS)**

  - Barcode scanning support
  - QR code scanning for quick product lookup
  - Quick product search
  - Cart management
  - Multiple payment methods
  - Receipt generation

- **Inventory Management**

  - Product CRUD operations
  - Categories management
  - Suppliers management
  - Stock level tracking
  - Product labels and barcode/QR code generation

- **Sales Management**

  - Sales history and details
  - Sales returns processing
  - Receipt printing

- **Reporting**
  - Sales summary reports
  - Product performance reports
  - Inventory status reports
  - PDF report generation

## Technology Stack

### Frontend

- React
- TypeScript
- React Bootstrap
- React Router
- Axios
- Chart.js

### Backend

- Node.js
- Express
- MongoDB
- JWT Authentication
- PDF Generation

## Installation

### Prerequisites

- Node.js (v14+)
- PostgreSQL

### Frontend Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/bike-pos.git
cd bike-pos
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:

```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server

```bash
npm start
```

### Backend Setup

1. Navigate to the server directory

```bash
cd server
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the server directory with the following content:

```
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/bike_pos
JWT_SECRET=your_jwt_secret_key
```

4. Set up the database

```bash
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

5. Start the server

```bash
npm start
```

## Demo Accounts

- **Admin**

  - Username: admin
  - Password: password

- **Manager**

  - Username: manager
  - Password: password

- **Cashier**
  - Username: cashier
  - Password: password

## Usage Guide

### Point of Sale (POS)

1. Log in with your credentials
2. Navigate to the POS page
3. Scan product barcode or search for products
4. Add products to cart
5. Process checkout with customer information and payment method
6. Generate and print receipt

### Inventory Management

1. Navigate to Products page to add or manage products
2. Use Categories page to organize products
3. Manage suppliers through the Suppliers page
4. Track low stock items from the Dashboard

### Printing Labels

1. On the Products page, select products you want to print labels for
2. Click the "Print Labels" button
3. Enter the quantity of labels needed per product
4. Click "Print Labels" to generate a PDF preview
5. From the preview modal, you can:
   - View the labels as they will be printed
   - Print directly to your printer
   - Download the PDF for later use
   - Close the preview without printing
6. When printing, configure your printer settings appropriately for label printing

### Reports

1. Navigate to Reports page
2. Select report type and date range
3. View charts and tables with data
4. Generate PDF reports as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please contact support@bikepos.com or open an issue on GitHub.
