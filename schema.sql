-- cPanel > phpMyAdmin > veritabanini sec > SQL sekmesi > bu dosyayi yapistir > Git
-- Once cPanel > "Manage My Databases" ile bir veritabani + kullanici olustur.

CREATE TABLE IF NOT EXISTS contact_messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at  DATETIME     NOT NULL,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL,
  company     VARCHAR(160)     NULL,
  interest    VARCHAR(120)     NULL,
  message     TEXT         NOT NULL,
  lang        VARCHAR(5)       NULL,
  ip          VARCHAR(45)      NULL,
  user_agent  VARCHAR(255)     NULL,
  mail_sent   TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_created (created_at),
  KEY idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
