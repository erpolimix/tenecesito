export type LoginActionState = {
  error: string | null
  shouldStartOAuth: boolean
}

export const INITIAL_LOGIN_ACTION_STATE: LoginActionState = {
  error: null,
  shouldStartOAuth: false,
}
