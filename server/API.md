# 台球会员积分系统 API

Base URL: `http://localhost:3000`  
Content type: `application/json`

## Authentication

`POST /auth/login` is for administrators. `POST /member/auth/login` is for members.
Both return a JWT `token`. Every protected request must include:

```http
Authorization: Bearer <token>
```

Tokens expire after 7 days. A missing, expired, or invalid token returns `401`.
Using a token with the wrong role returns `403`.

## Public endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Administrator login |
| POST | `/member/auth/login` | Member login |
| GET | `/ranking?page=1&pageSize=20&search=` | Public ranking; returns id, name, points only |

## Administrator endpoints

These require an administrator token.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/users` | Paginated member list |
| GET | `/users/:id` | Member details and recent records |
| POST | `/users` | Create member |
| PATCH | `/users/:id` | Update member information/status |
| POST | `/points` | Add or deduct points |
| GET | `/points/records` | Latest 100 point records |
| GET | `/ranking/statistics` | Dashboard statistics |
| GET | `/pk` | PK match list |
| PATCH | `/pk/:id/settle` | Settle a PK match |
| PATCH | `/pk/:id/cancel` | Cancel a PK match |

`POST /points` example. `operationId` must be a UUID generated once for this entry operation; submitting the same operation ID again returns the original record without adding points again.

```json
{ "userId": 1, "amount": 60, "note": "manual entry", "operationId": "a1f4b0e5-6604-4e10-9c58-2fb9a876f220" }
```

`PATCH /pk/:id/settle` example:

```json
{ "winnerId": 1 }
```

## Member endpoints

These require a member token. The current user is always read from the JWT; client supplied user IDs are ignored/not accepted.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/member/auth/change-password` | Change own password |
| GET | `/pk` | Returns only own PK matches |
| POST | `/pk` | Create a PK challenge as current member |

`POST /member/auth/change-password` example:

```json
{ "oldPassword": "123456", "newPassword": "new-pass" }
```

`POST /pk` example:

```json
{ "opponentId": 2, "stake": 100, "date": "2026-08-13", "time": "19:30", "note": "first to 7" }
```

The server rejects self-challenges, disabled/non-existent members, duplicate appointments for the same pair/time, and stakes over 10000. PK settlement is administrator-only.
