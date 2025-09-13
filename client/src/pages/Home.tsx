import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user } = useAuth();
  const [location] = useLocation();

  return <div>Home Sweet Home Let's build the home page here.</div>;
}
