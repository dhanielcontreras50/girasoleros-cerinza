# Girasoleros Cerinza

App para el celular de la finca de girasoles en Cerinza, Boyacá: control del cultivo por temporadas y lotes, de las semillas tostadas y de la rentabilidad.

- Se instala desde el navegador (Chrome en Android: menú › "Instalar app").
- Funciona sin señal: lo registrado se guarda en el celular y se sube a la nube al volver la señal.
- Datos, fotos e ingreso con Google en Firebase (proyecto `girasoleros-cerinza`).

## Desarrollo

```bash
npm install
npm run dev        # app conectada a Firebase
MOCK=1 npm run dev # app con datos en memoria, sin Firebase (para probar pantallas)
npm test
```

Cada cambio en `main` se publica solo en GitHub Pages (`.github/workflows/deploy.yml`).

Las reglas de seguridad están en `firestore.rules` y `storage.rules`: se pegan en la consola de Firebase.
