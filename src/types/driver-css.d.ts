// Declaración ambiente para el import dinámico del CSS de driver.js.
// El tour carga estos estilos con `import("driver.js/dist/driver.css")` y
// `import("./app-tour.css")`; TS (moduleResolution: bundler) necesita un tipo
// para esos módulos de solo efecto secundario.
declare module "driver.js/dist/driver.css";
declare module "*.css";
