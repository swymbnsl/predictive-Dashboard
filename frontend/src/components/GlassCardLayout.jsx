import React from 'react';
import styles from '../styles/GlassCardLayout.module.css';

const GlassCardLayout = ({ children }) => {
  return <div className={styles.card}>{children}</div>;
};

export default GlassCardLayout;
