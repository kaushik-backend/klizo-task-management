# Admin User Seeder

## 🎯 Overview

This system enforces that **admin users can ONLY be created through database seeders**, not through the public registration API. This ensures security and prevents unauthorized admin creation.

## 🔒 Security Policy

- ✅ **Registration API**: Only creates users with `role: 'employee'`
- ✅ **Admin Creation**: Exclusively through database seeders
- ✅ **No Public Admin Registration**: Impossible through API endpoints
- ✅ **Controlled Access**: Only system administrators can run seeders

## 🚀 Quick Start

### 1. Create Admin Users

```bash
# Using npm script
npm run seed:admin

# Or directly
node seed-admin.js seed
```

### 2. List Admin Users

```bash
# Using npm script
npm run seed:admin:list

# Or directly
node seed-admin.js list
```

### 3. Remove Admin Users (for testing)

```bash
# Using npm script
npm run seed:admin:remove

# Or directly
node seed-admin.js remove
```

## 👥 Default Admin Users

The seeder creates two admin users:

### Super Admin
- **Email**: `superadmin@klizo.com`
- **Username**: `superadmin`
- **Password**: `SuperAdmin123!`
- **Role**: `super_admin`

### Admin
- **Email**: `admin@klizo.com`
- **Username**: `admin`
- **Password**: `Admin123!`
- **Role**: `admin`

## ⚠️ Important Security Notes

1. **Change Default Passwords**: Immediately change passwords after first login
2. **Secure Access**: Keep seeder scripts secure and restrict access
3. **Environment Variables**: Ensure proper environment configuration
4. **Database Security**: Use strong database credentials

## 🔧 Configuration

### Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://localhost:27017/klizo

# JWT Secret
JWT_SECRET=your-secret-key

# Other configurations...
```

### Customization

Edit `src/seeders/adminSeeder.js` to:
- Change default admin credentials
- Modify organization settings
- Add more admin users
- Customize roles and permissions

## 📋 API Behavior

### Registration Endpoint (`POST /api/auth/register`)

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "organizationName": "Acme Corp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Admin users are created exclusively through database seeders.",
  "data": {
          "user": {
        "role": "employee"  // Always 'employee', never 'admin'
      }
  }
}
```

### Swagger Documentation

The Swagger documentation clearly states:
> "Only regular users can register through this endpoint. Admin users are created exclusively through database seeders."

## 🛡️ Security Features

1. **Role Enforcement**: Registration always creates `role: 'user'`
2. **Seeder Protection**: Admin creation only through controlled scripts
3. **Audit Trail**: All admin actions are logged
4. **Validation**: Multiple validation layers prevent unauthorized access

## 🔍 Monitoring

### Check Admin Users

```bash
npm run seed:admin:list
```

Output:
```
👥 Listing admin users...

📋 Admin Users:
- Super Admin (superadmin@klizo.com)
  Role: super_admin | Status: active | Created: 2024-01-15
- System Admin (admin@klizo.com)
  Role: admin | Status: active | Created: 2024-01-15
```

### Database Query

```javascript
// Find all admin users
const admins = await User.find({ 
  role: { $in: ['admin', 'super_admin'] } 
});

// Find users by role
const superAdmins = await User.find({ role: 'super_admin' });
const regularAdmins = await User.find({ role: 'admin' });
```

## 🚨 Troubleshooting

### Common Issues

1. **Seeder Already Run**: If admins exist, seeder will skip
2. **Database Connection**: Ensure MongoDB is running
3. **Environment Variables**: Check all required env vars
4. **Permissions**: Ensure proper file permissions

### Error Messages

- `Admin users already exist` - Normal, seeder skipped
- `Connection failed` - Check database connection
- `Validation failed` - Check input data format

## 📚 Related Files

- `src/seeders/adminSeeder.js` - Main seeder logic
- `seed-admin.js` - CLI script
- `src/routes/auth.js` - Registration endpoint
- `src/config/swagger.js` - API documentation
- `ADMIN_SEEDER.md` - This documentation

## 🔄 Workflow

1. **Initial Setup**: Run `npm run seed:admin`
2. **Login**: Use default admin credentials
3. **Change Passwords**: Update default passwords
4. **Monitor**: Use `npm run seed:admin:list` to check status
5. **Maintenance**: Run seeder only when needed

This ensures a secure, controlled admin user management system. 