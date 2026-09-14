export function success<T>(data: T, message = "Operación completada") {
  return { success: true, message, data };
}
