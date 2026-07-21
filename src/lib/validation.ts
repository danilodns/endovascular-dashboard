import { z } from 'zod';

const requiredString = (msg: string) => z.string().trim().min(1, msg);

export const procedureSchema = z.object({
  name: requiredString('Informe o nome do procedimento.'),
});

export const brandSchema = z.object({
  name: requiredString('Informe o nome da marca.'),
});

export const materialTypeSchema = z.object({
  name: requiredString('Informe o nome do tipo de material.'),
});

export const stateSchema = z.object({
  name: requiredString('Informe o nome do estado.'),
  uf: requiredString('Informe a UF.').max(2, 'A UF deve ter no máximo 2 letras.'),
});

export const materialSchema = z.object({
  name: requiredString('Informe o nome do material.'),
});

export const companySchema = z.object({
  name: requiredString('Informe o nome da empresa.'),
  state_id: requiredString('Selecione um estado.'),
});

export const sellerSchema = z.object({
  name: requiredString('Informe o nome do representante.'),
  email: z.string().trim().email('Informe um e-mail válido.').or(z.literal('')).optional(),
  phone: z.string().optional(),
  tier: z.string().optional(),
});

export const procedureMaterialSchema = z.object({
  procedure_id: requiredString('Selecione o procedimento.'),
  material_id: requiredString('Selecione o material.'),
});

export const materialSellerSchema = z.object({
  state_id: requiredString('Selecione o estado.'),
  seller_id: requiredString('Selecione o representante.'),
  material_id: requiredString('Selecione o material.'),
});

/** Converts a ZodError into a flat { field: message } map (first message per field wins). */
export function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
