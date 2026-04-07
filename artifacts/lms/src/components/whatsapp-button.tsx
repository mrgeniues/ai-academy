import { motion } from "framer-motion";

const WHATSAPP_LINK = "https://whatsapp.com/channel/0029Vb5pEK34tRrkKVuBCy0Q";

export function WhatsAppButton() {
  return (
    <motion.a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        width: 56,
        height: 56,
        borderRadius: "50%",
        backgroundColor: "#25D366",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(37,211,102,0.45)",
        cursor: "pointer",
        textDecoration: "none",
      }}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="30"
        height="30"
        fill="white"
      >
        <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.469 2.027 7.773L0 32l8.437-2.012A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.28 13.28 0 01-6.771-1.851l-.485-.288-5.009 1.195 1.22-4.874-.317-.5A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.878c-.398-.199-2.355-1.163-2.72-1.295-.366-.133-.632-.199-.898.199-.266.398-1.031 1.295-1.264 1.561-.232.266-.465.299-.863.1-.398-.199-1.682-.62-3.204-1.978-1.184-1.057-1.983-2.362-2.215-2.76-.233-.398-.025-.614.175-.812.18-.179.398-.465.597-.698.199-.233.266-.398.398-.664.133-.266.067-.498-.033-.697-.1-.199-.898-2.164-1.23-2.961-.325-.778-.655-.672-.898-.685l-.765-.013c-.266 0-.697.1-1.063.498-.366.398-1.396 1.364-1.396 3.328s1.43 3.86 1.629 4.126c.199.266 2.815 4.298 6.821 6.028.954.412 1.697.658 2.277.842.956.305 1.827.262 2.516.159.767-.114 2.355-.963 2.688-1.893.332-.93.332-1.727.232-1.893-.099-.165-.365-.265-.763-.464z" />
      </svg>
    </motion.a>
  );
}
