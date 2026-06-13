import { base44 } from '../api/base44Client';
export async function UploadFile(data) { return base44.integrations.Core.UploadFile(data); }
export async function InvokeLLM(data) { return base44.integrations.Core.InvokeLLM(data); }
export async function SendEmail(data) { return base44.integrations.Core.SendEmail(data); }
export async function GenerateImage(data) { return base44.integrations.Core.GenerateImage(data); }
export async function ExtractDataFromUploadedFile(data) { return base44.integrations.Core.ExtractDataFromUploadedFile(data); }