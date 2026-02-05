# Test Data for User Registration

You can use these JSON payloads to test the `POST \/auth\/register` or `POST \/user\/register-as-user` endpoints.

## 1. Customer Registration (Default)
**Note:** `role` defaults to `CUSTOMER` and `isActive` defaults to `true`.

```json
{
  "email": "john.customer@example.com",
  "password": "Password@123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+94771122333"
}
```

## 2. Customer Registration (Explicit)

```json
{
  "email": "jane.customer@example.com",
  "password": "Password@123",
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "+94772233444",
  "role": "CUSTOMER"
}
```

## 3. Salon Owner Registration
**Note:** Registers a user with the `SALON_OWNER` role. The `userCode` will be generated format `SSLS-YY-XXXX`.

```json
{
  "email": "owner.salon@example.com",
  "password": "Password@123",
  "firstName": "Salon",
  "lastName": "Owner",
  "phoneNumber": "+94773344555",
  "role": "SALON_OWNER"
}
```

## 4. Admin Registration
**Note:** Registers a user with the `ADMIN` role. The `userCode` will be generated format `SSLA-YY-XXXX`.

```json
{
  "email": "super.admin@example.com",
  "password": "AdminPassword@123",
  "firstName": "Super",
  "lastName": "Admin",
  "phoneNumber": "+94770000000",
  "role": "ADMIN"
}
```
