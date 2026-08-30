export interface AppwriteErrorInfo {
  message: string;
  code: number;
  type: string;
  friendly: string;
  hint?: string;
}

const TYPE_HINTS: Record<string, string> = {
  collection_not_found:         'This collection does not exist in your Appwrite database. Create it in the Appwrite dashboard.',
  document_not_found:           'The document was not found. It may have been deleted or never created.',
  attribute_unknown:            'An attribute used in this query does not exist in the collection schema. Check your collection attributes.',
  document_already_exists:      'A document with this ID already exists in the collection.',
  database_not_found:           'The database was not found. Verify your database ID in environment settings.',
  storage_bucket_not_found:     'The storage bucket does not exist. Create it in the Appwrite dashboard.',
  storage_file_not_found:       'The file was not found in storage.',
  user_already_exists:          'An account with this email is already registered.',
  user_invalid_credentials:     'The email or password is incorrect.',
  user_not_found:               'No account was found with this identifier.',
  user_session_not_found:       'Your session has expired. Please sign in again.',
  general_unauthorized_scope:   'Your API key does not have the required scopes for this operation. Update it in the Appwrite console.',
  general_rate_limit_exceeded:  'Too many requests sent. Wait a moment then try again.',
  general_argument_invalid:     'One or more values sent to the database are invalid or out of allowed range.',
  general_query_limit_exceeded: 'This query returned too many results. Add more filters.',
  index_not_found:              'A required index does not exist on this collection. Create it in the Appwrite dashboard.',
};

const CODE_MESSAGES: Record<number, string> = {
  400: 'The request contained invalid data.',
  401: 'Authentication is required. Please sign in and try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This item already exists.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'A server error occurred. Please try again later.',
  503: 'The service is temporarily unavailable. Try again shortly.',
};

export function parseAppwriteError(err: any): AppwriteErrorInfo {
  const message = err?.message || 'An unknown error occurred';
  const code: number = err?.code || 0;
  const type: string = err?.type || '';
  const friendly = CODE_MESSAGES[code] || message;
  const hint = TYPE_HINTS[type];
  return { message, code, type, friendly, hint };
}

export function formatErrorDescription(err: any, userRole?: string | null): string {
  const isDev = process.env.NODE_ENV === 'development';
  const isAdmin = userRole === 'SUPER' || userRole === 'FINANCIAL';
  const { message, code, type, friendly, hint } = parseAppwriteError(err);

  if (isDev || isAdmin) {
    const parts: string[] = [message];
    if (type) parts.push(`[${type}]`);
    if (code) parts.push(`(${code})`);
    if (hint) parts.push(`— ${hint}`);
    return parts.join(' ');
  }

  return friendly;
}

export function logAppwriteError(context: string, err: any): void {
  const { message, code, type } = parseAppwriteError(err);
  console.error(`[Appwrite] ${context} — ${message}`, { code, type, raw: err });
}
