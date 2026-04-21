import React, { createContext, useState } from 'react';

const AuthContext = createContext<{ token: string | null; user: any }>({ token: null, user: null });

export default AuthContext;