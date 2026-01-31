# 🚫 Desactivar Vercel Toolbar en Producción

El Vercel Toolbar aparece automáticamente en producción cuando tienes un proyecto conectado a Vercel. Para desactivarlo completamente:

## Método 1: Variable de Entorno en Vercel Dashboard (Recomendado para Producción)

**Pasos:**

1. **Ve al Dashboard de Vercel:**
   - Abre https://vercel.com
   - Inicia sesión con tu cuenta
   - Selecciona tu proyecto (ASLI)

2. **Navega a Settings:**
   - En el menú superior, haz clic en **Settings**
   - O ve directamente a: `https://vercel.com/[tu-usuario]/[tu-proyecto]/settings`

3. **Ve a Environment Variables:**
   - En el menú lateral izquierdo, haz clic en **Environment Variables**
   - O ve directamente a: `https://vercel.com/[tu-usuario]/[tu-proyecto]/settings/environment-variables`

4. **Agrega la Variable:**
   - Haz clic en el botón **Add New** o **Add**
   - En el campo **Key**, escribe: `VERCEL_TOOLBAR_DISABLED`
   - En el campo **Value**, escribe: `true`
   - En **Environment**, selecciona:
     - ✅ **Production** (para producción)
     - ✅ **Preview** (opcional, para previews)
     - ✅ **Development** (opcional, para desarrollo)
   - Haz clic en **Save**

5. **Redespliega tu aplicación:**
   - Ve a la pestaña **Deployments**
   - Haz clic en los tres puntos (⋯) del último deployment
   - Selecciona **Redeploy**
   - O simplemente haz un nuevo push a tu repositorio

## Método 2: Usando Vercel CLI

Si prefieres usar la línea de comandos:

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Iniciar sesión
vercel login

# Agregar la variable de entorno
vercel env add VERCEL_TOOLBAR_DISABLED production
# Cuando te pregunte el valor, escribe: true

# Redesplegar
vercel --prod
```

## Método 3: En el archivo vercel.json (Alternativa)

Crea o edita el archivo `vercel.json` en la raíz de tu proyecto:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "VERCEL_TOOLBAR_DISABLED": "true"
  }
}
```

**Nota:** Este método puede no funcionar en todas las versiones de Vercel.

---

## Verificación

Después de configurar la variable y redesplegar:

1. Espera a que el deployment termine
2. Visita tu sitio en producción
3. El toolbar de Vercel ya no debería aparecer

---

## Importante

- **La variable debe estar en el Dashboard de Vercel**, no solo en `.env.local`
- `.env.local` solo funciona en desarrollo local
- Para producción, **siempre** usa el Dashboard de Vercel o Vercel CLI
- Después de agregar la variable, **debes redesplegar** para que tome efecto

---

## Troubleshooting

Si el toolbar sigue apareciendo después de configurar la variable:

1. Verifica que la variable esté en **Production** environment
2. Verifica que el valor sea exactamente `true` (sin comillas)
3. Asegúrate de haber redesplegado después de agregar la variable
4. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
5. Verifica en el Dashboard que la variable esté activa
