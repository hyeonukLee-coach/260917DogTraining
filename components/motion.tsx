"use client";

import { motion } from "framer-motion";

/** Framer Motion 래퍼: 카드/버튼류에 공통으로 쓰는 살짝 커지는 hover 애니메이션 */
export const MotionDiv = motion.div;

export const hoverScaleProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

export const fadeInProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};
