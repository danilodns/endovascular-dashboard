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
  tier: z.string().optional(),
});

export const sellerContactSchema = z.object({
  state_id: requiredString('Selecione o estado.'),
  email: z.string().trim().email('Informe um e-mail válido.').or(z.literal('')).optional(),
});

/** Converts a ZodError into a flat { field: message } map (first message per field wins). */
export const zodErrors = (error: z.ZodError): Record<string, string> =>
  Object.fromEntries(
    (Object.entries(z.flattenError(error).fieldErrors) as [string, string[]][])
      .map(([key, messages]) => [key, messages?.[0]])
      .filter(([, msg]) => !!msg)
  );
