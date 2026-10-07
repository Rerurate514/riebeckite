---
publish: true
---

# {{title}}

Bienvenido a tu sitio Riebeckite. Este preset es un recorrido: registra el catálogo completo de plugins que incluye Riebeckite y prepara contenido para mostrar cada capacidad en pantalla.

## Explorar

- [Plugins — paquetes representativos por capacidad](/framework/plugins)
- [Temas — paquetes de diseño incluidos y cómo cambiar](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)

## ¿Qué es Riebeckite?

Riebeckite es un framework extensible y orientado al contenido que construye sitios estáticos rápidos desde Markdown simple — las mismas notas que guardas en Obsidian. Incluye más de 50 plugins y seis temas; este sitio demuestra ambos.

## Editar este sitio

El contenido vive en `content/` como Markdown simple. Añade un archivo, pon `publish: true` en el frontmatter y aparecerá en el sitio compilado. Las notas de `content/Daily/` alimentan el widget Daily Notes de esta página.

Este sitio está disponible en siete idiomas: la página de inicio, examples y las páginas framework están traducidas, mientras que guide y las páginas de referencia de plugins y temas permanecen en inglés. Cámbialos con el selector bajo el título.

Las páginas localizadas usan la convención `<base>.<lang>.md` junto al archivo por defecto (p. ej. `about.ja.md`). El plugin l10n las sirve bajo rutas `/lang/` y las enlaza automáticamente.

Abre `riebeckite.config.ts` para ver cada plugin registrado y sus opciones.
