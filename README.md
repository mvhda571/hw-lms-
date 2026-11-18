# AvtoKatalog

Avtomobillar ro‘yxatini ko‘rish, kategoriya yoki nomi bo‘yicha qidirish, narxini o‘zgartirish va o‘chirish uchun kichik boshqaruv paneli.

## Ishga tushirish

Node.js 18 yoki undan yangirog‘i kerak. Terminalda loyiha papkasidan:

```powershell
npm start
```

Ilovani `http://localhost:3000` manzilida oching. Portni `PORT` muhit o‘zgaruvchisi orqali o‘zgartirish mumkin. Tashqi paket o‘rnatish shart emas.

## Tekshiruv

```powershell
npm test
```

## API

- `GET /api/cars` — katalog ro‘yxatini qaytaradi.
- `PUT /api/cars/:id` — `{"price": 390000000}` JSON tanasi bilan narxni yangilaydi.
- `DELETE /api/cars/:id` — avtomobilni ro‘yxatdan o‘chiradi.

O‘zgarishlar `data/cars.json` fayliga yoziladi va sahifa yangilanganda saqlanib qoladi. Boshlang‘ich katalogdagi avtomobillarni o‘zgartirish yoki qayta tiklash uchun shu JSON faylini tahrir qiling.
