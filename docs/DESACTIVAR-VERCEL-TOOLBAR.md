# 🚫 Desactivar Vercel Toolbar

El Vercel Toolbar aparece automáticamente cuando tienes un proyecto conectado a Vercel. Para desactivarlo:

## Opción 1: Variable de Entorno (Recomendado)

Agrega esta variable en tu archivo `.env.local`:

```env
VERCEL_TOOLBAR_DISABLED=true
```

**Pasos:**
1. Abre el archivo `.env.local` en la raíz del proyecto
2. Agrega la línea: `VERCEL_TOOLBAR_DISABLED=true`
3. Guarda el archivo
4. Reinicia el servidor de desarrollo (`npm run dev`)

## Opción 2: Desde el Toolbar

1. Haz clic en el icono del globo de Vercel
2. Busca la opción de configuración o settings
3. Desactiva el toolbar desde ahí

## Opción 3: Desconectar Vercel (No recomendado)

Si no necesitas la integración con Vercel en desarrollo local, puedes desconectar el proyecto, pero esto afectará los despliegues automáticos.

---

**Nota:** Después de agregar la variable de entorno, el toolbar desaparecerá en tu entorno local. Los despliegues en Vercel seguirán funcionando normalmente.

