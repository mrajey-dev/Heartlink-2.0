-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Aug 07, 2026 at 11:33 AM
-- Server version: 11.8.8-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u773098752_heartlink`
--

-- --------------------------------------------------------

--
-- Table structure for table `aadhaar_verifications`
--

CREATE TABLE `aadhaar_verifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `aadhaar_number` varchar(255) NOT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `date_of_birth` varchar(255) DEFAULT NULL,
  `year_of_birth` varchar(255) DEFAULT NULL,
  `care_of` varchar(255) DEFAULT NULL,
  `full_address` text DEFAULT NULL,
  `house` varchar(255) DEFAULT NULL,
  `street` varchar(255) DEFAULT NULL,
  `vtc` varchar(255) DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `pincode` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `photo` longtext DEFAULT NULL,
  `raw_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_response`)),
  `status` varchar(255) NOT NULL DEFAULT 'VERIFIED',
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `aadhaar_verifications`
--

INSERT INTO `aadhaar_verifications` (`id`, `user_id`, `aadhaar_number`, `reference_id`, `full_name`, `gender`, `date_of_birth`, `year_of_birth`, `care_of`, `full_address`, `house`, `street`, `vtc`, `district`, `state`, `pincode`, `country`, `photo`, `raw_response`, `status`, `verified_at`, `created_at`, `updated_at`) VALUES
(5, 16, '855166824855', '82051687', 'Ajay Ananda Watpade', 'M', '26-11-2000', '2000', '', 'Bahaduri, Nashik, Bahaduri, Maharashtra, India, 422205', '', '', 'Bahaduri', 'Nashik', 'Maharashtra', '422205', 'India', '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', '{\"@entity\":\"in.co.sandbox.kyc.aadhaar.okyc\",\"reference_id\":82051687,\"status\":\"VALID\",\"message\":\"Aadhaar Card Exists\",\"care_of\":\"\",\"full_address\":\"Bahaduri, Nashik, Bahaduri, Maharashtra, India, 422205\",\"date_of_birth\":\"26-11-1999\",\"email_hash\":\"\",\"gender\":\"M\",\"name\":\"Ajay Ananda Watpade\",\"address\":{\"@entity\":\"in.co.sandbox.kyc.aadhaar.okyc.address\",\"country\":\"India\",\"district\":\"Nashik\",\"house\":\"\",\"landmark\":\"\",\"pincode\":422205,\"post_office\":\"Bahaduri\",\"state\":\"Maharashtra\",\"street\":\"\",\"subdistrict\":\"\",\"vtc\":\"Bahaduri\"},\"year_of_birth\":1999,\"mobile_hash\":\"0e9358e96711895f26159e65bfbf7e9b46e9bf837faf5fa092aaf8e317330a3b\",\"photo\":\"\\/9j\\/4AAQSkZJRgABAgAAAQABAAD\\/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL\\/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL\\/wAARCADIAKADASIAAhEBAxEB\\/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL\\/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6\\/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL\\/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6\\/9oADAMBAAIRAxEAPwD1DFGKdSY5rOyGFKMUlFADqdimU7PSmAUcUlG4ZoEBptR3F1BbR75ZEjUd2OBXOan430azjcm\\/iJXqqnJH4DmgDpWdR1IqB7yBDhpF\\/OvLNQ+JltIxW3kcj+9sIFYU\\/i95fnN0QD2GaVmNI9rOo2v\\/AD1H500X1q3SRTXiEWvtcnCXjE+mcGrMeqXUTA+c5\\/GlYrlPalnjY8MDTwV9a8w0\\/wASSAgO5\\/Gups9cWQDLCmiWjpieRTSBVCG\\/WQ9RVpZdw60CJSBTSBik3Y4oLU9ALoNLmgLgU7bSGMJo+tSbaUJigBmPrRT\\/AFrgvHPir7BbSWVrdRrPIjAMrcrjqc+vOBjng+lNAdlPdxwA5dQ3YE1w\\/iHxytjmJOrA42nkj29PrXk82vXsRmKXkv737+GOG78j0rDu7+aeXc8jMfUmnyhc6LXfFOo6y5UuyQqCNq9x79zXOtI4Pz7ufWq6OxcHgj3qy2SuSML9c1foSN8wN2bFIX96jaQrleSue1OkkVQoUfgeaBCl1Iz75rb03VlkxBK3zdFYnrWDwwyGIPoah+YNkcH1FJq5Sdju1kK4I4rUstRdCATXIaRqTTH7PMfnA+Vj3rbQ4YVnsa3TR3dhqBYA5roLW9yVBPWuI0lt2K7CwiBAoIZuI+8DmnE7aIIsAVI6dqRJq7KXbT6M0xkezI708JxSn2paBDWTKkYyfavlW\\/nuLq+e4nO0yjeBjHynpj2r6tzjpXy\\/4qgitPEuoWcEjtBaytbx7jkqqfKB+GKqIHPXDhjtVTgUy2tjPKF5x7VZjCBwGx71rabAiMZQvB6A0TlZF04czKyaOuzCh8n1FRPpU6rtJOB04rpxcEjoPyoDhgeBXOqsjpdGLOMNq6uVdDjscU5tPkKFtvFdTLFGCDtGaqTSgKRjIqnVb2I9ilucpsaNuRRt35I6+5rTuolkyVP4VnlcNyCcdsVtGV0c8o8rCB2jlR04ZTmuzViSBXFD5W4611enTGWKFj1IGaGEWdpodsxVTXd6fanaua5bQYztSu7sI8KKgTZbii2rQ8YzxUwGaaR60wLeaM00GlBpJjHigU2gHFO4h9fMfjqKW28b6wkqspe6kcBhj5WOQfoQQfpX032rw74z2Ai8RWl2kSoJ7YBnH8bqxBz6kLsH0xTiBwVosKxNLKq8nAB71cjvUzzhV+lSWWnJHbRyy88AhavPd2UMJM4i9BuGahyTdrXOhRaV72J7Ge1uGEYYFq0\\/7PV1BUda5+2S3uJQ8ChWzlSpxn862bK6ZHd\\/tHyt1VvWsJJXN4Tl1ElsQBzxisa7ijUEEipdV1aZ5vJWQDPcVQ\\/skzndcSyDPXiqjHuROo27JGZOURztIx7GqU+MbhWtdaVbJ8qTnPvxWcbSRGKE7lI4Nbxa6HPJPqUg2Wziuk0gn7ND6g\\/1rmlBBx3rqtBiMrQR9yatmaPUvD0ZMaV29oMIK5jQoPLiUEdq6yBQE4qBEuaQnigmoyeaGBdA4pVBxz1pwFKBSGJilwadil207AMx9c15j8WorS+srHyru3a8trgo0AlUuFcckrnPBVfzr025aSO0meJN8ioSq+pA4FeASqJx5zkvKTvZzySxJzk1LlymtOnz3fYpyossZiGQuMcVP5KTWSWs6LsjzsZVKsARgjII4IJGKuWsAyCQPfNaAgDHaFH5Vz8\\/K9DuVLmWpgMAkCW8KukUedqjAGT+tSWtsQCW5rUu7YRx\\/KPmPenWulzSkbQScZIqZTb1LjS5TiNXhK3RdOCprY0+8tbjR57a4RJJJV+SRlw6NkH73PHHTHNN1y02u\\/GDWZpg3MV7qeQe9bKWlzlnT96xFdWW3zmZVeaVy5ZFCIMnoFAwB7AYqOONkjAYciuja3iZM7cH0rKukCMcChT5mKVPlRzcqbbp1\\/2jiuu8LGJLxPMPPAX61zF18t4WUAtgVuaMkkt7bBFy5ccY966LnLbS57TphwFB9K6S3OUrE02yaOOPK44Fb8MRAxQyLjWOKYastHge9RstSMvilpgal3Uhj6WmZpc0AOrw7xPbLpHiPUbSIfuBJ5gCLgKGUMBj0GcfhXuGa4Tx7o0s01vqltCzlEKTMv8ACByDgdvvZP0qZ7G1GXLL1OCglUoCtW1mxWcEeCRo3BVh1B446j9KZPceRHv564xXM43djsjUsaUlwR820Nt5ANNs766jllk+0GVmGRHtClPoR1rEd7uZSXZYkPQE8mnQQGL5lnH45GapUwdVvYgurwy3zvOflxgRgZOfUmoLOCOCV5GILOc\\/SobyFjLvWTJ9SMZqs13LGwVxx61fK7WRlz2d2bU0i7eO9Zdw4Y8UfaCVqrI\\/U9hzThCzIqVLmayGW9kYcivRvhvYefqN1MYPMEUGEJHRty8j3xmuK0uxmvrmC2iG6aWTaiqM5Jr2vwPoY0fS5dzGSUuCxGFAyBkc8nGK6YdzlqOysdlbQAjsOauLGEWq1vNjgAACp2kwO1DM0I\\/eoXxTmbNRE1JRPmlzUYNLnioKJd1LuqJc0+gB+aC1MBoJoA87+I2mGO5g1SJf3bjypcdmH3T+IyPwHrXClhIAD2Ne6XtpBf2ctrcIHhlXayn\\/AD1714RqcQ07VLuz3FhBM8QY99rEf0qJq+qN6UtLMZJCGfcx5+vWpJpLKG3Csr789QOKWBRI4y3XvVqW1idPmIz296hSaZ0WstDEv1hlG+HIFZ5Xcm1uQO5rXuQscZU446VizP5ak5q4ybMqiQwvzgdB61XupNsZGeTxTGnC9KgnJLJn0zWqRztnVeDNPM12J3AOOFDDIx3r2myMzRIjbQo5AUYry3wHPB5KozDcDyO9etWKqVBTirb0MXqzThXauc5qRjmo1OBQxqWxoCaYzYpCaYxpFF3FLilxSgVIwApSpxxSgU+gBgHFGKeBSEUAYHinxHa+GdMN1P8APK+RDCDgyMP6DIya8Uu7h9XmmvJQoluHaVtowAzEk49smpvGusyeJfFOyKQiF5BBBx91AfvY\\/NvxphVI7mWOIbUViFX0FFSNo3NKLTlYzlN1HJx8yg\\/dHBqV7+5VR+5kAHIqw6FZgfXtWnAsE1uWbAYdQe1Y867HR7N9GcrcXs0mcwufTIrNljmk+ZztHoDW7euskjCMfKO9UIoi8nzc4rWMtLmMo62uVIbT+Nvwp4tDK3mfwkFR9R\\/+utBoSxVFGWY4Aq3fRLA8dsnSFMEjux5J\\/OtIa3ZnUtGyMvSbiSxu1cEjBwa9n8N6sZYky2c+9eNPEd28D611PhzW47IKkzlcd6CGj21HWRQwoI5rC0bXLO5jASdTntmt5WDDIORSENNMIyKkNRmkMu5pQah3Uu6hjJw1ODVX3gck1m6h4k0vTIpGuLuLdHnMauC5I7AZ69P60AbW70rhvE\\/jzT0tbrT9Of7VM8TI00Z\\/dx5BGQ3c88Y49+K47xZ42u9eJtbYvbafn7gOGl\\/3sdvbp9cA1zqfJaPjuKaj3E2UdObzPFFpu9Sf0rTkBTUJ1Ix8+R9P85rFsZPK8RWbdcvit7VZI11VPlKmTKqfUD5v5sfzq6kb0rhRlaqh7puAPpQ9ozrx3p0eXjxSiR0BHWuC56TM24tvLQrioreHCE9\\/Wr0iNKeTUkFp5jCMHC\\/xH0FaRvLRbmcrRXMyGyjERe9fogITPc1nSyGR2kY5LEmtDV5ljRYEOF6AVlkHbwa75QUEonncznJyBTg81IGDDGM1XLEnFTRjArOxZPDczWkweJypHTBruNC8cNGFjuST9a4JyWXH4ioFlOcHrUtD3PebTxDa3ighgKvpcK44NeHWGtTWbDqQK6\\/SvF8DFVkYqfelYLHpm6sDxD4ttNC2xGNp7hgSEVgAv+8eoznjg9DXA6\\/401K9vZo7a4ltrUNhI0O1sDjJI559M4rli7OeSTk0+XuK5t61411bVWZHuDFC3Hkw5RSOnPc\\/Qk1kQoSuWPXtVFztkye1XYXzEpwTkdhVJA2NlGTxUqnMBFRs3OSuKjMhXOMigRn3O+K4imjH7yNwy\\/hW5r9xFe6bb6nb\\/J5ciMAT03BgwP4qP8mseXkknGar\\/aHTT7m2cZhkXcvswOQR+tUn7rTBL3kzprGYOPqM1MBv6GsTRbgsiZOcCtKCfy7khuledJanqxd0XEiZnVQuSTgD1NLNfw2dw1rs3I2FaVW5BxkkdiP85pJrlnhneA7XSPKgdT8wBH\\/fJNcm87312RuyAMZ9q7sHBKPOzgxkm3yFu6la51GRyAFQmNAOnHU0j\\/KvSml\\/mJJJb35qJriIHl+auTu7nPFWRKgA60\\/I7niqn2sEkICTVS8urhAMbVBPUcmpsVcvz3SxDGfmPQd6ZGCTvJ5qvaQ5jJPLHkk9TVpQBTsJE4ORzSbsMQCeKZuwM+lIM9aCr2NC4H7+TjHzHg9uabEMj8adPgTvg\\/xGktzlmH41TWpKKt18mTSQmT7Njcwx7028O+dEHc5NTkbLftzSAplpHnC8AE0OZFcDPFWLdMyBsUTpk5AoECxs6HJB\\/CoLhFeFo8bTjj0q9buOBTL6HdGWXhgODSGZmjXJhmMTdQa6NoS5Djv6VydxG1tPHOvCt+ntXWaVcC4hXJ4xyfSuepBt6HfRqLl1LNvGYkkmaMtGiMXOOMYPWuPhuVtIGk27pZjlV9u2a6jUr1xZSbiFtz8oQDG769z39q5m1gNxMZ5B16D0FdXs\\/ZRUepxVKvtZcwiwyzjfO\\/XnaOBVhIFQZAx6VZKjIApzqFTB7VJKKVvGDKxx3pNTg\\/0ct3HNW7ZBjJ7mnX6boTx2oQyrZDdCD7VIThsVHp3\\/AB7j2NEsmLwIeMjIoEPc5AAPU07NMzmQnsOKkVDI6oByxxTt0A0L0fv8g5BUY\\/l\\/SoYGAds+lWb8BRGR3BH+fzqiCVR29eKuorSZMHdEcf766Zz0HyipblhuCD6CnWkYRCfT+dQsd9x64qCizbp6dQKcw3U6EdfpQ+RQAxY9rcU+blMGkVqR270gM6eLzbN0PVelW\\/DDF451POwBcfX\\/APUaZj96y9mFGhzJa3FyjHH\\/AC0yB1x2\\/nWlJJzVxSk1FpD9dl866W1XOExu\\/wA\\/SookCqABUK5nnaZurMW\\/z+v51biWpnLmlcUVZWHogLZNRTtn86nPAqq53SqOwqSiaIBQKW4XdEfpSgHGae\\/MOKBmVp5wHX0NJqI2qsw+9Gf0pYP3d5Iv94ZqadfMjZexBFMRDC26NT681ZgGZiy\\/8s1zn0PaqFkxaEA9VyDWna\\/6g56vk\\/0H+P41pSjeREnZBHdGewCvxLE21s+3FOCFlVR9aKKqruEdETSfJHsH41Tg5dm9TRRWRZehHDZpWUEUUUAiLGDTmGVzRRSAgZTlTzwantfD15eWV7qVvPEiW5KNExIaT7p47cZz17HpRRRsG5UiQKqqOoUVajXAoopAJIeKrAbpSaKKAJueMGpWHyYoopjM+4QrKsqjkU\\/7ygjkGiigTMxSY72WEcFzlfxrcQhEyeFQYAoorqoLRsyqbn\\/\\/2Q==\",\"share_code\":\"2345\"}', 'VERIFIED', '2026-07-28 03:40:33', '2026-07-28 03:40:33', '2026-07-28 03:40:33'),
(6, 40, '724750424989', '82883604', 'Trupti Rameshwar Taskar', 'F', '25-10-2004', '2004', 'D/O: Rameshwar Tasakar', 'Rui, Niphad, Nashik, Rui, Maharashtra, India, 422305', '', '', 'Rui', 'Nashik', 'Maharashtra', '422305', 'India', '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', '{\"@entity\":\"in.co.sandbox.kyc.aadhaar.okyc\",\"reference_id\":82883604,\"status\":\"VALID\",\"message\":\"Aadhaar Card Exists\",\"care_of\":\"D\\/O: Rameshwar Tasakar\",\"full_address\":\"Rui, Niphad, Nashik, Rui, Maharashtra, India, 422305\",\"date_of_birth\":\"25-10-2004\",\"email_hash\":\"\",\"gender\":\"F\",\"name\":\"Trupti Rameshwar Taskar\",\"address\":{\"@entity\":\"in.co.sandbox.kyc.aadhaar.okyc.address\",\"country\":\"India\",\"district\":\"Nashik\",\"house\":\"\",\"landmark\":\"\",\"pincode\":422305,\"post_office\":\"Rui\",\"state\":\"Maharashtra\",\"street\":\"\",\"subdistrict\":\"Niphad\",\"vtc\":\"Rui\"},\"year_of_birth\":2004,\"mobile_hash\":\"a71686c234f2d3d8335b0e98a985fc920ea2e0dda3195918b63e96a5d209f950\",\"photo\":\"\\/9j\\/4AAQSkZJRgABAgAAAQABAAD\\/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL\\/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL\\/wAARCADIAKADASIAAhEBAxEB\\/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL\\/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6\\/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL\\/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6\\/9oADAMBAAIRAxEAPwC8VyOlLtxTgT6Cnbe+7NSA0Lz70\\/AweAaXA6ZpwGaAI169OakICrk0EAcgc0wkseaAG\\/NK2AOKsRoFHpRGgAzjGKg1DVLPTYDNeXCxR5xk8k\\/QDk0CJ8A9qXAHBFcDq3xNtoN0enW3mt0Ek3C\\/gByfzFcbf+OtbvHyL2WJc5CxHZj8ufzp2A9y2g5qMpivAx4p1rAH9p3f\\/f5v8au2HjfW7GWMm9llVTykx3gj055o5Q1PbGTimDBHPWua8OeO7DWdlvdBbW7Jxgn5HPse3PY+3JrqmXB7c0mgIdgPB605UZSGViAePpUiqScYq2ISYiDnp2FSykii4cNgj8xWXMpLscd63XGV3nPTnBrGkLbzinETKpDZ9Ku2iEICVySeKrEn3rQtoy0S8cHvmmxIkKEHkcUoq8bXPByfrTDabWOMCgZXXBp27H1qwLPuTinCzJAHP86AKhwaeoA9BU\\/2NgcfyrG8S6smgaPLct80uNsaf3m\\/zz+FAFPxP4qtfD9uUBWS7Zfli9PdvavG9W1q81i7ea4lZ2bpz0HoPQVDqN9NqF2800jSSSHLMx5NSWNk5fcwOOtNtIajcorbzSZKqTinraSsMhSRXVw2YK8Lj3AqyumgHdtAY9cVi66NlRZy8Gll8Z7jiorqxkjYkLxXXvaFOijHpiopIi+dyDA4BqVW1KdE4lGeJsjIIruPCPjabTpEs71jJYtwMnLRHtj29vxHvjX9nGyEqoBHtWI8bwtuwcZ4NbxmpGEoWPpGzeO7hjmgkEkUgBV15BFbiWjhThCwKjjjNeP\\/AAp8RAamui3UwRJzuhdmwEbuvPqMnr1Hqa+joYLB02LPDIMAMQ47+w6Z\\/rUyTuJHBXlsbaRwoxGy55WuekALHFerahBZPpk4dozIkLYAI5Iz059q8vliJckZpxTFIqbQO5rThB8hAq4AHJx\\/n1qiI2JAIruW8Lx28eS7bYwMklcHgHgHOep9OhokETHDEMBn8aSUFSCDmjcenIpW+demKLDJEJdAQRUhGME1VTKGpw3XnINADsgDOTXjvxT1VptZjskkBS2jG5SP425PP0216\\/IyLGzNxgV87+MLl7rxHeOzOcSso3jBABwBj9KaAzLe2aT5z90nqa6PTbQgD5sj0JrM0y2LIHf8B6V0lmm3Fc1Wb2R00odWXobYKBxVkQewpYiMDNWVdVGeM1y6s6Cs8Hy9OtVXtRzgc+taRfNQSHqKBnOXlnls5\\/DNc\\/fWcpJYHK9a6+7GWzgVgahEyIWQH3XPWumlKxz1ImHZXMlpeRyRsyuhBBU8g+1fR2n3KXmnwXClsTRq\\/IwcEZ6dq+a+Fn4z1r3rwVI7eErElmY4YDd2AYiuw42bjrgHb064pFbaMEAinueDxTBz1pCE2pgHbz1pmxSB8o46AilbAb8McUvbg0gLSNuA5GeOacPlYhulRD5Gwcn8KeSueRSLH\\/KR3696FIyNox+NICCMgHFKu0clcCkBHOSY8npkfzrwHXIvtHiO4Xr+9ZifbNe0+JdeTQ7WLMJkeYkKM4AAxkk4PqP1rx66jll1y7nlXHmAMoByACeKOZLQtRe46OWG1iG9goHFadjfWrrzKAfQ1mL9mtT51wN7e\\/QU6bUtMkJXHlSD2Yf0xWDgmbKTR1ls9vcL+7mUnGeKsralo9ysD+Ncdayi3kyS4ByAScg\\/jW7Y3O9WAYnPrWM4KJrGfMbAsdgy7AD1zVa4FvEuWmTj3xVC9vnDhS56VhXMhnkLMzbRwTkAD8TSjDmCU2jSvbu1jU\\/vQT6LzWU9xDcplDnsakivNJiGC0cjnqfMz\\/8AWqK5gtbgb7YGJx6cVsopaGTk2YN7biK6V16OcV7D8OzPJ4ZXeNqCZhH6leOfzz+VeVX8RMcXGW3gYr1fwnqWn29jaaVHcKblYuQFbDNjJwSMHvXVF6HPNa6HUNkDkVHg5FObPHJpjBuR0pmYc5PJpwxg0xGO4A0F+uBigC5uOc8ikOScg5BprcgjilUkgAgDioLHKOAMYpRlT0\\/CkBA7in8dwD9KAOO8YwHz0nYllaBkA7KRk\\/rn9K4u4tVt9SKBcAouQe3J6V3vi5Gkt0xkKD\\/Qj+tcLfXLT3SzMmF5G71PpXPNNTOmDTgVLqwLTRzxrlozkcZx+FV5dKN\\/eyXMshVpMb1QcN068+1dBbspHTrV1bbcMgYrNVnE19kpGZqH+msZpYo432hcQptU\\/UEn86TSo\\/LkJ5C1Z1BRbwk46VFppLR7mPXoKmUm1cqMUnYr3qBrxy3K0+EGITbY0kWZChZk+6pBBCkfd4PWkvT5c4J6HmtG1QMnHFEZNIUopuxy1vpn9n3iTtIJ1iUiNH5C5zxj05PHvU1pppiLSkMiu2dmOB+HaupMS9THyD1xVW6KqhqnWciFSUTn54PNvYI0VS3mKcN045rSgtpPtnmxsXuonXygOm7qMDp1qta+VJfl5TjaMr9en9TXR6NCj68r7Q0YIYgjgkD+YJ\\/Sr1ckhKyi2zuC2SMg0juSehJNKzAnJ4FNZdy5yfauw4SMyYfpin7xgcDnqagYtyvGaljkOOSAenNAEvnKG5wfwqQzxkA5AP0rPBUnDBTTSwHH8qks0kmjJHzU83ER6P8Aoaz1bAOKXhue9Aivrwhn06QbskD3rgNR1OG50+C2QKjwkDBOWOBjH0rv7xQ9s0Z\\/iFeV6vZvbakZAh2bs5xQ9tBpJtNmhYznOK24bwRqQcc1y8D7ZODV1nMYDE1xThqdsJaF3VCZoAQrPhgWCjJxUek3tmgdZByvG1\\/lIP0qsmpwLw0yg+lTKbC5O53jLdckY\\/nU8rtZoq+t0R3d3BJKAjNnnBVSR+eMVoWjmKCMt2AznrVUz2sRAjkj449KY12p4DqfoaLdEh31uzXe4VlGDxWNqVwACoNL5rbCegFZlw5ckk04Q1IlLQ1NJ0uK70i+vJJVR0BCZPJIG4\\/5\\/wD1Vv8AhiBiwmKgEgdPQVydjG0jLECdpOa9D0aIQW6\\/KPpXbGKvexxuTSaua7FW4PY00YANDuuxSV5JqNmB7VoZiOgPPGfSos7X+UcdxTy4GcqR+NRk5H3evvSAQ5U5AoHzN\\/iaYDlTj8jQpwQPzqSiTkcdqfwVAz0qMjnNRySbXRO7fy7\\/AOfegLk7Zy2WXArm9bto7lzABj5d0hHp6Vuq\\/BwcflWPcr\\/pV78wLO6j6DYP8TTGcLKVhuWgBwV6e4q7Cwlj2uenaqut2X+lqFJVichl7VVguXhufKuQVkAwD2cVjONzaErF6W3DHch5HSpYntVj2z253dyo61csvLYZ4JJrRNujIDsXn2rHna0OiK6o56eGK4bMUYVO24DNENvFCAVRcjnOK2J4VT+EA57VlzSBC3PtRzuWgpLqxbifKCNeveqExbhEG5zwBUU99HE5VfnkPYdvrVrTYWmm8zIEnTnpW1OFjCczpdGsEbYW+8Rkeh+ldfGgjRVzg+tcppN5lpbGcEOD5kTMeVPfB+pz7hq6y0XCruwWxnk10JHOyaVvkXB4z6U3PAINSSleOOlQdeAMUMQ1nLfLnNNzgDB4pwRVHSmOflzxmkBECQxOcClBGRz+lG4HgYDVIYJlTfIpjQ4OWB5B7gDk\\/hSsVcb5h\\/hNUr55ozHJCu91yNv94HqB78D\\/AOtnNb9vojy2wuGYrxv8s8bvY+laEGmxyBStv5IxnaQM\\/iRVcpPMkclbyGRyphugVO1ibaQ4P4D9elcvq2q3WkXlzbtZH7RLJ5m+VtwVSoAGBwenr\\/LJ9gthHMHis5rWTy+HCOGKn3weDXn3xD0mUT219NkhkaE7RwuMkfidx\\/Kpn7quVB8zsedRzz3d8007bnY+mAPbFaVzZRXdvskHI5Vh1FV\\/ICSrgYAGBWnHh0wevrXJOV9TqguhhJe3ekPiVTLD\\/eHWtKHxPbyDmUADs3FOkjYEjaGHoRmqEtlZSks9sAfYYovGW6GuaOxPeeIoGUrG29j\\/AHeazh9t1A\\/KPJj7nvUq2sCHEMQGe+K1IU8uEBsCi6itAs5PUyHtI7RMKpJ7sepro9DOlTIqm8kguD0Rot3OBwDkZ79hWTd\\/vMgVVeEbAMcnitoSstTKcbnYxQg6srIQWRCFlX0z6H1I\\/wDHa6K3c7QfmyMcDt7Vd8LeFxYeHohJHi4mHmylhk5PQHPoMDHt71AdOvbUYEZf5iBt4yAcZz+vaug5yZp\\/lx0\\/GmKxbgnAz61WeVt+1kZWHBBFKsvsfrSAsMyqpyf1qsZGbA5+lS4D8\\/pmgRqGyaAN630ryQTHwQOZCMsPoe34c+9adlo0Txi4kGckt8xJLE9Sc1IUadkQ\\/LFn5j6+1bChfJcKBgAdKqxFykYVUEAHk\\/8A1qlhhAXJAGanRAY898tjP1NQTwgo++SZl67VbaRgdBjBpoBRDbxNJcbUjc4DPgDd9fWsPxJpH9r6VcWiAGXHmQ5\\/vjt6cgkc9M1h3\\/iCGK9tZ7iykiEaM0Ss5aTOVwWyMdvuk++a6LRNWXWLdm486NsNxww7MPapcoy925p7OcVzWPD5YSsnNPT5QAa9H8aeFTIz6tZxAg83MajlT3f6ev5+pHBPbFRwOPSuCpFxdmdlOSkroz5naNtyniq7XWedoya1ZLRZFwaqnSgScE1mmuppYopIXkGBU0kjY21aWxEQ6UgtiWzjiqTQrFeOLd261raDoB1XxFYQFQ0IctKCCQVAyQfqOPxpsUAzmvRfAOjtBBPqcq4Mo8qL3XOWP5gD\\/gJrSneUrGVS0Y3OwijErMDwT1FPnt1QFYxgAYx2FWoIwm5z0NV7kFiFBxnqa70cBzmo6Ok8olCDe3BJFYtzYG2RyWWLHP7xgFx9T0ruZY0jQM7AIq5LMeBWbeCGQqpDEnBBEZK4z64xTsFzhkkygdcOhPDKcg\\/jT\\/PPo3FaPiDToNsl1pF7DFeKC0iRlW8wAH7y8gnrziifSJ202G7KLHM0atNEhyobHO3k8fifrUuJSkXrDWJ4dWcX8a20ZQkRJIrhMdcnqfWrGm+K9Gs4bm1kniikMzMSkZVWyc9OT3+nHHFamv6LBdwJdQQRpcxyqxfYCeoycdyO36Vymr+Gr658WabJZ2UculQSKZpZSrLsbblCrcn7pxxwX7URvezKlyuKaPQraSOe0jmidXjfLKynIIJOCKTA3E03T7RLW0eGLIjEjFI+MRgn7q47f56YFKxO7HWqIOTm8M3erazdNfxQR2isTDLHnewPAHUjgDngdRjOSa6TRtHs9KtzBEvfJc9SauK67iv8Q7H0pTU8qvexXPJq1xJ7UqCy8GuK1vwnDfO09lsguCPmjPCOfUeh\\/Q+3JrvRIUQcbl7iq01pHcZeFsN6GlOCkrSCM3F3R4rf6Re6ccXVpJCM43MuVJ9mHB\\/A1CBEICcfNXtSxSRnaQVNVJdB0m4jdJtMtMscsyxBWP4jmuSWE7M6o4rujxYKpJ4qN92QqISScAAdTXrv\\/CD6CG3Lp5z73EpH5bqv2miWdiym0s4YnUbQ6oN+P97qfzoWGlfVg8TG2iOK8NeC5p9t1q8bQxcFLc8O\\/wDvf3R7devTHPoAEMRihHlxg\\/LHGMDgDoB7CnPDJHAzgAvj5Qe7ds\\/jXK6vpmrgW93JPE1wkgztbAx6JwDn0yT\\/AI9EYKC90wu6j95nQ6fqg1ETeRPBNbRStGHizyRg4PoRnHfPXjpVmXhifRc15\\/qUFxa6deTR+ILmHU7JXnntSwKMCCwwqkYLdic5ycjNHhK+8UawbXUP7QsbjTzIqTRhiZByNykbeCAc9emDzxXQkmroyejPQ5Bz16Vh6tPdho0tQVGd8sxUEIo6Dnuf0x7itjfu3sRgZNZuu6RNqulJaxXX2ZmkDu2zduHPykZHt+VSJHHPriNdTJNC588FRLIoOV2g4ZcgEYPpxk9QebNnrN9cXYtYIFuVjQlU2+USBgfMTkZB9MfpWu\\/heD7GFku52dTuLnHJHQADpjAA7+pNaum6fDZp8kah25Zu\\/wCdZ2lfc2coW0RqMwlhDqRyV3fmOackaiGcqoGXB4FcT4Z1i7tbb+ztTz9oW6SAKBuC5UnGT1GUbBPqK7S4u4bPTrq4nbbFDG0rkDOFAyTj6CraszEkg+7L\\/vf0qEcyH2qPT9Rtr+xN1aTxzQyN8rocg8D9fanx8kk00BBPe2ezP2yJJI24JkAGfQ57Hp\\/9cCre4EDHQ8g1z934WS6vbi8M\\/wC\\/bLQnGNjcbcnnIBGencdxmtPS0uI9LhS6TbMuQVznaMnAzk9sd6Sb2aLcVa6ZqD7uKpzTLalpHYKgBJOelWVPA5rG13Sor+3zJD9pKOJFjdiFyORwCP1pkonXXI2uLVjI5hnQlVEWQMYyzMOFAz39vWs3UviD4e093R2aRlBP7teDg4\\/yenvXN\\/Y9RaK72WvlWRSRLiLfx909MtgjPXIPHSpdZ0U33hSK00jw\\/ZXYuUH72NkiaFgAA5JwSfp1AIPWlCSejRc4W1TNq18ValqDOLPwvc7RtZHnl8pWU9GBIwfXjPFdLDNIYl8yNElx8wRiwB9iQM\\/kKwPCOg3WgaMLW9vZLu4LZJLsyRjAAVM9AMeg610AG0VTt0MxzfMvz8+1U7m3iuyA4JC9Oeh65qZ3JO0U5Vx2pWGZmq+H9K1dY21GyhuJEGFcjDAemRzjr+dW7Gzt7CKG3toUhhiztjRcBRj0qduTiopGwxIOMIT+opiGqN7onYksallbEqJg4Jxn0qOEgXDHBIVB0Gaxb7xPYxPNaymeKUkxoyxF8t2xtyfTqKVxpNmrKQ8uT\\/q09upqeNSse5xhm7elJEqjnghf50Mxc7vXhf8AGkI4GEXdh4gtbS4aFXnnDM4OWkwB0z645A9Oldfr4lOh3aKgdJozFIpbA2sME5+hqK60u3W4S6DN5i4GHbOBnt3zV5vONvIu9JVKEBXGCfqR\\/hSirFSlc8u0+71HSpktLZikcU2fsySfM3I6gdc9PevQ7Ce\\/vYy88JtPRGYMSPXinW9luE8U0aSQhklj3jcQ3IJ578D6Zq1Ef3hweKIxcepc6in0LMLMBhzk+tSM3IqFykSNI7hUUElicAD1NVtO1KHVLFLuDd5TswXdwSAxGfxxmrMjSB46UrDjNMByM0CYSMUXkrySBxn0z60rAZ9zbrlywzHKNrr2Oas29tbR\\/PDAkZ77BtH5ClmAZSpGKgt5DG\\/lv+FOwXZfyBTHalzkZxVeaeK3RpJ5UjjQZZnbAAzj+dIZIvHbmpM4+tRQyxTxJNEyvG6hlYHIYEZBB+lOJAPr9KBDJZEiV3lcIijJYnAA9TXFa7r+o6Xr7tvSTTp4DHEAAQrfLnJHOTz7YA98ddM0Vx5tuW2sycg9R7471xer6LPO0EDEvMokdSjABuASMtyCTkjqOxPelK9tC6fLf3jsdK1G11CCWe1kDrgKTgjB\\/GqWoaJbzwTvEiLcMpKu\\/IBJyfpmqPg+wmsLR1cFRKPmjYncrr1\\/PrkdeK2r2cRR5OeSB05NStVqOXuy91jbBHt7G3tWILpGFcA55x0\\/z6VOX3yeQrjdgGQj+FfT9D+tYeqW95JYXBhvbiK6ljIVIAMqfUcbt2PQ\\/hWlpVkNL01IGOZWG+eQnq5681WxG+oXzR2lhNNEoLAcE+5p6XSJA0jsFUKWZjwAO5NFFCEV9P1KO\\/luxD80cAQCTHDE5Jwe44FTxnByOo60UVTBD9RgkvdIvLaFgks8EkaO3RWZSAT+JrkfC091o15dafqFrJbW4\\/eJIwOwH+Lk5Hccg4yPeiiqjroJnVT6rbN5cAcmOXCvKjEBQQcYI5ydpGR065BxmvJ4jtogiWUAlXaCih1TdxwFB7\\/XA96KKifuq6NKcVJ6mhbXf2y1E4hkiySNkmAeCRn8cZ\\/Go5GBYEdQaKKZD0ZNJNKlu7QRiWQDKoW27vbP+fwrkb2+vbzXraFre4snlYxLkFsnB3MCQAABz1PQYzRRUuN3ZlwlZNnYxIlvAkS8JGoUc9gMU4MCMg5BooqiCOaOOVQJI1cA5wwzXMavc6Vp0bz3iRIVb92FUZd8HAx36n8+MdaKKcdwNdbsRx26juikP6nFZfiLxDa6fdWSyAs0pb5VG7aRjkgc4OfTrRRUvQcVdlzRtWF9E08Fu3PAlc8H6Dr+lamASGcbm6jPQfQf5NFFC1VwkrOx\\/9k=\",\"share_code\":\"2345\"}', 'VERIFIED', '2026-08-06 03:20:31', '2026-08-06 03:20:31', '2026-08-06 03:20:31');

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_message_counters`
--

CREATE TABLE `chat_message_counters` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sender_id` bigint(20) UNSIGNED NOT NULL,
  `receiver_id` bigint(20) UNSIGNED NOT NULL,
  `sent_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_message_counters`
--

INSERT INTO `chat_message_counters` (`id`, `sender_id`, `receiver_id`, `sent_count`, `created_at`, `updated_at`) VALUES
(4, 48, 40, 5, '2026-08-06 13:17:14', '2026-08-06 13:19:19');

-- --------------------------------------------------------

--
-- Table structure for table `date_bookings`
--

CREATE TABLE `date_bookings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `proposer_id` bigint(20) UNSIGNED NOT NULL,
  `partner_id` bigint(20) UNSIGNED NOT NULL,
  `restaurant_id` bigint(20) UNSIGNED NOT NULL,
  `booking_date` date NOT NULL,
  `booking_time` varchar(255) NOT NULL,
  `status` enum('pending','accepted','declined','cancelled') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `date_bookings`
--

INSERT INTO `date_bookings` (`id`, `proposer_id`, `partner_id`, `restaurant_id`, `booking_date`, `booking_time`, `status`, `created_at`, `updated_at`) VALUES
(7, 16, 40, 3, '2026-08-09', '3:30 PM', 'accepted', '2026-08-06 12:53:43', '2026-08-06 12:54:02');

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sender_id` bigint(20) UNSIGNED NOT NULL,
  `receiver_id` bigint(20) UNSIGNED NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_by_sender` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_by_receiver` tinyint(1) NOT NULL DEFAULT 0,
  `sender_reaction` varchar(16) DEFAULT NULL,
  `receiver_reaction` varchar(16) DEFAULT NULL,
  `reply_to_id` bigint(20) UNSIGNED DEFAULT NULL,
  `reply_to_text` text DEFAULT NULL,
  `reply_to_sender` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `message`, `is_read`, `deleted_by_sender`, `deleted_by_receiver`, `sender_reaction`, `receiver_reaction`, `reply_to_id`, `reply_to_text`, `reply_to_sender`, `created_at`, `updated_at`) VALUES
(389, 16, 2, 'Ji', 0, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 10:14:44', '2026-08-06 10:14:44'),
(390, 16, 40, 'Nit bgh hoil', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:31:26', '2026-08-06 12:31:45'),
(391, 40, 16, 'Nahi hot', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:31:51', '2026-08-06 12:31:57'),
(392, 16, 40, 'Jaude mg', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:32:03', '2026-08-06 12:32:12'),
(393, 40, 16, 'It\'s a bug', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:32:18', '2026-08-06 12:32:20'),
(394, 40, 16, 'Solve it', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:32:23', '2026-08-06 12:32:23'),
(395, 16, 40, '🥲', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:32:29', '2026-08-06 12:32:31'),
(396, 40, 16, '😁', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:32:36', '2026-08-06 12:33:10'),
(397, 16, 40, 'Overacting ke 50 rs kat', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:47:12', '2026-08-06 12:47:25'),
(398, 40, 16, 'Hey I like you', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:47:35', '2026-08-06 12:47:36'),
(399, 40, 16, 'Can you marry me', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:47:43', '2026-08-06 12:47:43'),
(400, 16, 40, '🫠', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:47:52', '2026-08-06 12:47:55'),
(401, 40, 16, '🥰', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:48:04', '2026-08-06 12:48:06'),
(402, 40, 16, 'You\'re such a amazing person', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:48:28', '2026-08-06 12:48:54'),
(403, 16, 40, '🙃', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:49:02', '2026-08-06 12:49:11'),
(404, 16, 40, 'I know', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:49:05', '2026-08-06 12:49:11'),
(405, 40, 16, 'Let\'s go on a long drive', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:49:26', '2026-08-06 12:49:28'),
(406, 16, 40, '😗', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:49:36', '2026-08-06 12:49:36'),
(407, 40, 16, '🫠', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:49:41', '2026-08-06 12:49:42'),
(408, 40, 16, 'Tommorow I\'m free', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:49:52', '2026-08-06 12:50:02'),
(409, 16, 40, 'Done ✅', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:50:07', '2026-08-06 12:50:08'),
(410, 40, 16, 'Okay', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 12:50:12', '2026-08-06 12:50:18'),
(411, 40, 48, 'Hey', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:17:26', '2026-08-06 13:17:28'),
(412, 48, 40, 'Hi', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:17:31', '2026-08-06 13:17:32'),
(413, 40, 48, 'Where are you from', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:17:40', '2026-08-06 13:17:42'),
(414, 48, 40, 'I\'m from Nashik, br aik mla 5 ch message free ahe', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:18:12', '2026-08-06 13:18:14'),
(415, 48, 40, 'Mla whatsapp number de tuzq', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:18:19', '2026-08-06 13:18:21'),
(416, 40, 48, 'Nahi denar', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:18:34', '2026-08-06 13:18:35'),
(417, 40, 48, 'Pal', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:18:37', '2026-08-06 13:18:39'),
(418, 48, 40, 'De na please', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:18:58', '2026-08-06 13:19:00'),
(419, 40, 48, 'Jay re tu nhi det', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:19:12', '2026-08-06 13:19:13'),
(420, 48, 40, 'Last message ahe yaar....ani jast type pn nhi hot', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:19:19', '2026-08-06 13:19:21'),
(421, 40, 48, 'Omg', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:19:27', '2026-08-06 13:19:27'),
(422, 40, 48, 'What I do then', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:19:33', '2026-08-06 13:19:34'),
(423, 40, 48, 'Premium ghe', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:19:42', '2026-08-06 13:19:45'),
(424, 40, 48, '🙃', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:19:45', '2026-08-06 13:19:49'),
(425, 40, 48, 'Are kuthe gelas', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:20:03', '2026-08-06 13:20:06'),
(426, 40, 48, 'Ignore karayla laglas ka', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:20:13', '2026-08-06 13:20:13'),
(427, 40, 48, 'Te pn lagech', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:20:19', '2026-08-06 13:20:20'),
(428, 40, 48, 'Nhi kahi tr thoda tri premium ghe', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:21:01', '2026-08-06 13:21:02'),
(429, 40, 48, 'Mazasobt bolayla', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:21:08', '2026-08-06 13:21:09'),
(430, 40, 48, 'Chal bye', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:21:33', '2026-08-06 13:21:34'),
(431, 40, 48, 'I\'m not interested', 1, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:21:38', '2026-08-06 13:21:41'),
(432, 16, 40, 'Okay babe', 0, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-06 13:28:39', '2026-08-06 13:28:39'),
(433, 16, 54, 'Hi', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-07 11:16:55', '2026-08-07 11:29:36'),
(434, 16, 54, 'Hi', 1, 1, 0, NULL, NULL, NULL, NULL, NULL, '2026-08-07 11:16:59', '2026-08-07 11:29:36'),
(435, 16, 54, 'Test', 1, 1, 0, NULL, '❤️', NULL, NULL, NULL, '2026-08-07 11:19:31', '2026-08-07 11:29:36'),
(436, 16, 54, 'Test', 1, 1, 0, NULL, '❤️', NULL, NULL, NULL, '2026-08-07 11:19:40', '2026-08-07 11:29:36'),
(437, 16, 54, 'Test', 1, 1, 0, NULL, '❤️', NULL, NULL, NULL, '2026-08-07 11:19:57', '2026-08-07 11:29:36'),
(438, 16, 54, 'Ji', 1, 1, 0, '❤️', NULL, NULL, NULL, NULL, '2026-08-07 11:26:23', '2026-08-07 11:29:36'),
(439, 16, 54, 'Bsbs', 1, 1, 0, NULL, NULL, 438, 'Ji', 'yourself', '2026-08-07 11:27:11', '2026-08-07 11:29:36'),
(440, 54, 16, 'Test', 1, 0, 1, NULL, NULL, 437, 'Test', 'Ajay', '2026-08-07 11:28:04', '2026-08-07 11:29:36'),
(441, 54, 16, 'Test', 1, 0, 1, NULL, NULL, 439, 'Bsbs', 'Ajay', '2026-08-07 11:28:18', '2026-08-07 11:29:36'),
(442, 54, 16, 'Ch hhhsnns shsj', 1, 0, 1, NULL, NULL, 437, 'Test', 'Ajay', '2026-08-07 11:28:46', '2026-08-07 11:29:36');

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_07_20_064231_create_personal_access_tokens_table', 1),
(5, '2026_07_20_070001_create_heartlink_tables', 1),
(6, '2026_07_20_090046_add_notifications_table', 1),
(7, '2026_07_22_043000_add_lifestyle_fields_to_users', 2),
(8, '2026_07_22_044600_add_is_boosted_to_restaurants_table', 2),
(9, '2026_07_22_070000_add_extended_profile_fields_to_users', 3),
(10, '2026_07_22_080000_add_clubbing_to_users_table', 4),
(11, '2026_07_23_103000_create_user_settings_table', 5),
(12, '2026_07_23_110000_add_is_verified_to_users_table', 6),
(13, '2026_07_23_120000_add_subscription_plan_to_users_table', 7),
(14, '2026_07_23_130000_add_lat_lng_to_users_table', 8),
(15, '2026_07_23_140000_add_vibe_to_users_table', 9),
(16, '2026_07_24_112000_change_lifestyle_enums_to_strings_on_users_table', 10),
(17, '2026_07_24_150000_create_subscription_plans_table', 11),
(18, '2026_07_27_130000_add_plan_limits_tracking_to_users_table', 12),
(19, '2026_07_28_100000_add_aadhaar_number_to_users_table', 13),
(20, '2026_07_28_110000_create_aadhaar_verifications_table', 14),
(21, '2026_07_28_120000_normalize_gender_values_in_users_table', 15),
(22, '2026_07_28_091815_create_chat_message_counters_table', 16),
(23, '2026_07_28_093250_add_deleted_flags_to_messages_table', 17),
(24, '2026_07_28_100209_add_reaction_columns_to_messages_table', 18),
(25, '2026_07_29_000000_create_vibe_posts_table', 19),
(26, '2026_07_29_143000_add_purchased_superlikes_to_users_table', 20),
(27, '2026_07_30_111244_add_phone_to_users_table', 21),
(28, '2026_08_07_000001_add_expo_push_token_to_users_table', 22),
(29, '2026_08_07_120000_add_reply_to_columns_to_messages_table', 23);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `from_user_id` bigint(20) UNSIGNED NOT NULL,
  `type` varchar(255) NOT NULL,
  `message` varchar(255) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `from_user_id`, `type`, `message`, `is_read`, `created_at`, `updated_at`) VALUES
(218, 11, 16, 'like', 'Ajay Ananda Watpade liked your profile!', 0, '2026-08-06 08:36:23', '2026-08-06 08:36:23'),
(229, 40, 16, 'like', 'Ajay Ananda Watpade liked your profile!', 1, '2026-08-06 12:45:00', '2026-08-06 13:17:04'),
(230, 16, 40, 'request_accepted', 'Sakshi has accepted your request!', 1, '2026-08-06 12:45:09', '2026-08-06 12:45:12'),
(231, 40, 16, 'request_accepted', 'You accepted Ajay\'s request!', 1, '2026-08-06 12:45:09', '2026-08-06 12:45:09'),
(232, 40, 16, 'message_reaction', 'Ajay Ananda Watpade reacted ❤️ to your message', 1, '2026-08-06 12:50:20', '2026-08-06 13:17:04'),
(233, 16, 40, 'message_reaction', 'Trupti Rameshwar Taskar reacted ❤️ to your message', 0, '2026-08-06 12:50:23', '2026-08-06 12:50:23'),
(234, 40, 16, 'date_proposal', 'Ajay invited you on a date at Velvet & Smoke!', 1, '2026-08-06 12:53:43', '2026-08-06 13:17:04'),
(235, 16, 40, 'date_response', 'Sakshi has accepted your date proposal!', 0, '2026-08-06 12:54:02', '2026-08-06 12:54:02'),
(236, 48, 40, 'like', 'Trupti Rameshwar Taskar liked your profile!', 0, '2026-08-06 13:14:34', '2026-08-06 13:14:34'),
(237, 40, 48, 'request_declined', 'Prem has declined your request.', 1, '2026-08-06 13:14:45', '2026-08-06 13:17:04'),
(238, 40, 48, 'like', 'Prem liked your profile!', 1, '2026-08-06 13:17:02', '2026-08-06 13:17:04'),
(239, 40, 48, 'request_accepted', 'You matched with Prem!', 1, '2026-08-06 13:17:02', '2026-08-06 13:17:04'),
(240, 48, 40, 'request_accepted', 'You matched with someone!', 1, '2026-08-06 13:17:02', '2026-08-06 13:17:02'),
(241, 40, 48, 'message_reaction', 'Prem reacted ❤️ to your message', 0, '2026-08-06 13:21:16', '2026-08-06 13:21:16'),
(243, 32, 16, 'like', 'Ajay Ananda Watpade liked your profile!', 0, '2026-08-06 16:18:12', '2026-08-06 16:18:12'),
(258, 2, 16, 'like', 'Ajay Ananda Watpade liked your profile!', 0, '2026-08-06 16:32:14', '2026-08-06 16:32:14'),
(268, 16, 54, 'like', 'Riyuu liked your profile!', 0, '2026-08-07 08:55:47', '2026-08-07 08:55:47'),
(269, 54, 16, 'like', 'Ajay liked your profile!', 1, '2026-08-07 08:56:34', '2026-08-07 11:27:48'),
(270, 54, 16, 'request_accepted', 'You matched with Ajay!', 1, '2026-08-07 08:56:34', '2026-08-07 11:27:48'),
(271, 16, 54, 'request_accepted', 'You matched with someone!', 1, '2026-08-07 08:56:34', '2026-08-07 08:56:34'),
(272, 40, 16, 'message_reaction', 'Ajay Ananda Watpade reacted ❤️ to your message', 0, '2026-08-07 11:10:59', '2026-08-07 11:10:59'),
(273, 40, 16, 'message_reaction', 'Ajay Ananda Watpade reacted ❤️ to your message', 0, '2026-08-07 11:16:33', '2026-08-07 11:16:33'),
(274, 40, 16, 'message_reaction', 'Ajay Ananda Watpade reacted ❤️ to your message', 0, '2026-08-07 11:16:36', '2026-08-07 11:16:36'),
(275, 54, 16, 'message_reaction', 'Ajay Ananda Watpade reacted ❤️ to your message', 1, '2026-08-07 11:17:02', '2026-08-07 11:27:48'),
(276, 54, 16, 'message_reaction', 'Ajay Ananda Watpade reacted ❤️ to your message', 1, '2026-08-07 11:26:25', '2026-08-07 11:27:48'),
(277, 16, 54, 'message_reaction', 'Riya Amar Shete reacted ❤️ to your message', 0, '2026-08-07 11:28:49', '2026-08-07 11:28:49'),
(278, 16, 54, 'message_reaction', 'Riya Amar Shete reacted ❤️ to your message', 0, '2026-08-07 11:28:50', '2026-08-07 11:28:50'),
(279, 16, 54, 'message_reaction', 'Riya Amar Shete reacted ❤️ to your message', 0, '2026-08-07 11:28:54', '2026-08-07 11:28:54');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(1, 'App\\Models\\User', 15, 'auth_token', 'd491aff31b89f36ab2024db4a4a90a66fe8c69da4e7f1fc3c71d8fe8ad705793', '[\"*\"]', '2026-07-21 00:48:24', NULL, '2026-07-20 23:45:36', '2026-07-21 00:48:24'),
(2, 'App\\Models\\User', 16, 'auth_token', '3def79f097d165f189a6f7c63fc4e33c45d2318736f183d21117fb27d6c14887', '[\"*\"]', '2026-07-21 00:48:26', NULL, '2026-07-20 23:48:00', '2026-07-21 00:48:26'),
(3, 'App\\Models\\User', 15, 'auth_token', '1650d53dd115d56e8f1d8c59d5ba00d9193d9b1714d4b980c2a3314f415cba28', '[\"*\"]', '2026-07-21 23:30:18', NULL, '2026-07-21 04:44:19', '2026-07-21 23:30:18'),
(4, 'App\\Models\\User', 17, 'auth_token', 'e3f1fd02b2ef2c8bc0a9be2587d301636347301023691a0af5b88881a5548a0b', '[\"*\"]', '2026-07-22 00:31:46', NULL, '2026-07-21 23:32:47', '2026-07-22 00:31:46'),
(5, 'App\\Models\\User', 16, 'auth_token', '36ccb0e9ce3b958f2b0be05aaedead47cbd793bc9f2ea2cbabea2cc7ab45a3fa', '[\"*\"]', '2026-07-30 00:59:59', NULL, '2026-07-21 23:35:02', '2026-07-30 00:59:59'),
(6, 'App\\Models\\User', 17, 'auth_token', 'f452ebe72946730b10b636490310a98fb2bee31fbba5afb6b47f1fad426636c8', '[\"*\"]', '2026-07-21 23:45:06', NULL, '2026-07-21 23:38:36', '2026-07-21 23:45:06'),
(7, 'App\\Models\\User', 16, 'auth_token', '580356b3c563ed079f4137f1ff8f159d380d69be8ceeaad256e2a6b2c259ba45', '[\"*\"]', '2026-07-22 00:23:02', NULL, '2026-07-21 23:45:19', '2026-07-22 00:23:02'),
(8, 'App\\Models\\User', 17, 'auth_token', '1f80e7fd523565d102b45cf1de9576ccecfddb477c3e589fe443cbd3e065159d', '[\"*\"]', '2026-07-29 05:19:28', NULL, '2026-07-22 00:23:18', '2026-07-29 05:19:28'),
(9, 'App\\Models\\User', 17, 'auth_token', 'e1b88165507167e5ade6992dad2fffac0fcd4617c1c145530543609f7a40684f', '[\"*\"]', '2026-07-22 01:37:32', NULL, '2026-07-22 00:32:05', '2026-07-22 01:37:32'),
(10, 'App\\Models\\User', 17, 'auth_token', '057fc821b5c754b70b73cda7797d28656cecf8318b8d02887e3ca333cd14f7f6', '[\"*\"]', '2026-07-27 04:46:12', NULL, '2026-07-22 02:02:41', '2026-07-27 04:46:12'),
(11, 'App\\Models\\User', 18, 'auth_token', '513a91d4c4412fae13eefc69727c507a051c85da23265d4b26c5cdd5682c72f0', '[\"*\"]', '2026-07-27 23:53:18', NULL, '2026-07-24 00:15:33', '2026-07-27 23:53:18'),
(12, 'App\\Models\\User', 17, 'auth_token', '0444ca9f96ceff0efdddb6e43ee79c5159faa3fe443cc2b56ae69f7bd972acda', '[\"*\"]', '2026-07-27 04:51:41', NULL, '2026-07-27 04:47:34', '2026-07-27 04:51:41'),
(13, 'App\\Models\\User', 17, 'auth_token', '8a884f4e249181d85084f10efcf4686d22ddba8b6a98c525e1dd96aefff3e2eb', '[\"*\"]', '2026-07-30 00:45:17', NULL, '2026-07-27 04:53:27', '2026-07-30 00:45:17'),
(14, 'App\\Models\\User', 17, 'test', '86437a638ff0e4e96b68b22732edd52c63173a7b0eafecbc6f443ad33c8fce10', '[\"*\"]', '2026-07-29 04:53:33', NULL, '2026-07-29 04:53:32', '2026-07-29 04:53:33'),
(15, 'App\\Models\\User', 37, 'auth_token', '1444ab60eb7a81a998614ae26e38942436c3f3099a6f90629902870abf81bee4', '[\"*\"]', '2026-07-30 03:35:18', NULL, '2026-07-30 02:16:42', '2026-07-30 03:35:18'),
(16, 'App\\Models\\User', 16, 'auth_token', '5e97d778236bf3fabb09a8280be9a70db730b3bc047e672b00643d3b88746ead', '[\"*\"]', '2026-07-30 05:44:06', NULL, '2026-07-30 03:31:50', '2026-07-30 05:44:06'),
(17, 'App\\Models\\User', 37, 'auth_token', 'c37fc8eedf74ffe1b158834d7da4d3f3f021299fabb42708206a2f22d1f79b0a', '[\"*\"]', '2026-07-30 04:06:26', NULL, '2026-07-30 03:35:33', '2026-07-30 04:06:26'),
(18, 'App\\Models\\User', 37, 'auth_token', 'a2f2a0df6fcaab90de17e4d59e962554ca67e48733c50bde6ee90179f8ce6767', '[\"*\"]', '2026-07-30 04:24:57', NULL, '2026-07-30 04:06:41', '2026-07-30 04:24:57'),
(19, 'App\\Models\\User', 37, 'auth_token', 'ab2e4cbfe3cf11f3e618e47bfe36e46c77bb0a2eed63563829e46c745de03d85', '[\"*\"]', '2026-07-30 05:38:46', NULL, '2026-07-30 04:25:17', '2026-07-30 05:38:46'),
(20, 'App\\Models\\User', 17, 'auth_token', '921278bbd798e32d49e7c2d67526624cd43b59a368f2b99bba5c36d1029cbd43', '[\"*\"]', '2026-07-30 05:49:24', NULL, '2026-07-30 05:47:44', '2026-07-30 05:49:24'),
(21, 'App\\Models\\User', 16, 'auth_token', 'a2b701cb08e0918a4decf7731713e9f78a5907315596775086ccf3589447d931', '[\"*\"]', '2026-08-03 11:33:38', NULL, '2026-08-03 11:16:30', '2026-08-03 11:33:38'),
(22, 'App\\Models\\User', 16, 'auth_token', '28405652676a3ad2778a25192fa69736f254e27a493168a45f9b6f2bf92519a7', '[\"*\"]', '2026-08-04 10:40:52', NULL, '2026-08-04 10:40:00', '2026-08-04 10:40:52'),
(23, 'App\\Models\\User', 16, 'auth_token', '374e3e55244eaab52ae58cd1f0be288fd26cc99a089d708ef164a1af1f942a09', '[\"*\"]', '2026-08-04 11:25:24', NULL, '2026-08-04 11:25:09', '2026-08-04 11:25:24'),
(24, 'App\\Models\\User', 16, 'auth_token', 'b468176343b9f5c47fb94f2458dd4345b050a49af9429f9e052926cfa4819227', '[\"*\"]', '2026-08-04 13:17:18', NULL, '2026-08-04 12:06:51', '2026-08-04 13:17:18'),
(25, 'App\\Models\\User', 16, 'auth_token', '067d0a4ff30d250e3662afebc23019aa23cdf6a74d3d98fd1a699196ed646bc2', '[\"*\"]', '2026-08-04 13:25:32', NULL, '2026-08-04 13:24:48', '2026-08-04 13:25:32'),
(26, 'App\\Models\\User', 16, 'auth_token', 'f319a60bdd93da3386f0bdc30f7c6ca87959f39a718a41aeabfd48b19a3af63c', '[\"*\"]', '2026-08-05 04:12:57', NULL, '2026-08-04 13:28:27', '2026-08-05 04:12:57'),
(28, 'App\\Models\\User', 16, 'auth_token', '12deba3294c8690da715392c4a358fec1a1e27e0f60d4deacc3c1cfdee0fbab1', '[\"*\"]', '2026-08-05 05:29:23', NULL, '2026-08-05 05:28:26', '2026-08-05 05:29:23'),
(29, 'App\\Models\\User', 16, 'auth_token', '189429ef070820a4b3a3fdb4a049dd154c7b820a5a73881cd9f220e3b4b6f490', '[\"*\"]', '2026-08-05 06:06:42', NULL, '2026-08-05 06:05:14', '2026-08-05 06:06:42'),
(30, 'App\\Models\\User', 16, 'auth_token', '4cc0896601ace1887608aba21d9d83049a368c3c8ce30c8611cbe9f30051ae1a', '[\"*\"]', '2026-08-05 07:39:51', NULL, '2026-08-05 07:37:15', '2026-08-05 07:39:51'),
(31, 'App\\Models\\User', 39, 'auth_token', '7e1d2bf4f8d2f737fe033d50e78db4e39f2e6e199be13d8ccca8cfd29cd9269b', '[\"*\"]', '2026-08-05 10:47:49', NULL, '2026-08-05 08:44:05', '2026-08-05 10:47:49'),
(32, 'App\\Models\\User', 39, 'auth_token', 'e31aca03a0745b321752bf50dc58e8f254577da0b90cc53de28cf3f87b338028', '[\"*\"]', '2026-08-05 10:39:53', NULL, '2026-08-05 10:37:29', '2026-08-05 10:39:53'),
(33, 'App\\Models\\User', 40, 'auth_token', '759090cce40784d519b91afbe97d96f4ce39a3e2e08f87206581c0b710012a2e', '[\"*\"]', '2026-08-06 03:23:37', NULL, '2026-08-06 03:07:30', '2026-08-06 03:23:37'),
(34, 'App\\Models\\User', 16, 'auth_token', 'b3a1c300fa29d1f6f0ca572403bc82ed74eaa9e07b564798fcc08a07d5f6b9d6', '[\"*\"]', '2026-08-06 04:15:22', NULL, '2026-08-06 03:23:54', '2026-08-06 04:15:22'),
(36, 'App\\Models\\User', 16, 'auth_token', 'ef0d2ae61cd0cf41f8ee297f8aeb91c0e3f57af32ed8824d8c6f64b7697cb0d8', '[\"*\"]', '2026-08-06 11:06:06', NULL, '2026-08-06 06:14:24', '2026-08-06 11:06:06'),
(39, 'App\\Models\\User', 44, 'auth_token', '550b147c95c3257a7384040ebe7d82ce10ea24650c34ed044089815ca8714c69', '[\"*\"]', '2026-08-06 06:54:43', NULL, '2026-08-06 06:43:12', '2026-08-06 06:54:43'),
(40, 'App\\Models\\User', 45, 'auth_token', '6f491907ecf9f56a6cfa7a05634e79b85ba286f3ae36461470c45cbf8eda2659', '[\"*\"]', '2026-08-06 07:26:04', NULL, '2026-08-06 07:00:37', '2026-08-06 07:26:04'),
(43, 'App\\Models\\User', 16, 'auth_token', '11e63b8031f7c664945dba2dc7546adc751b4b7e6baae2f17afca7ca5fe5ab1f', '[\"*\"]', '2026-08-06 08:50:27', NULL, '2026-08-06 08:06:01', '2026-08-06 08:50:27'),
(44, 'App\\Models\\User', 16, 'auth_token', '74e34953318d793cf55cbb752e274aa872d7b8a6ddf180ca81cf78479fd062be', '[\"*\"]', '2026-08-07 06:26:39', NULL, '2026-08-06 09:50:14', '2026-08-07 06:26:39'),
(45, 'App\\Models\\User', 16, 'auth_token', '3ccbfa71cb1bdfda862cf8988756de243d525b6603ce0662b7c9492c4a201b9d', '[\"*\"]', '2026-08-06 10:54:53', NULL, '2026-08-06 10:53:55', '2026-08-06 10:54:53'),
(46, 'App\\Models\\User', 40, 'auth_token', '81250643763bc7da6791420b2fb6b26245d2aea54248d00d07056f1e61006d86', '[\"*\"]', '2026-08-06 12:14:29', NULL, '2026-08-06 12:13:47', '2026-08-06 12:14:29'),
(47, 'App\\Models\\User', 16, 'auth_token', 'ee26325e80c6aea72753c7189dbb6db67f08153fbe5f0705bfcb22173ab30a01', '[\"*\"]', '2026-08-06 12:20:31', NULL, '2026-08-06 12:14:46', '2026-08-06 12:20:31'),
(48, 'App\\Models\\User', 40, 'auth_token', '9c73632866b3c146484acc6259d3637f93981dcceecab32339f7bc60b0b20226', '[\"*\"]', '2026-08-06 12:33:37', NULL, '2026-08-06 12:24:50', '2026-08-06 12:33:37'),
(49, 'App\\Models\\User', 16, 'auth_token', '63716ccbac7a9bc9062dd662148c170e7c44487526ce23b50c7d5026b248c3a3', '[\"*\"]', '2026-08-06 13:10:26', NULL, '2026-08-06 12:30:14', '2026-08-06 13:10:26'),
(50, 'App\\Models\\User', 40, 'auth_token', 'b5e5973452afab36da55e256cdfbae867847f5039954e65713e7250badcf4cf1', '[\"*\"]', '2026-08-06 13:22:05', NULL, '2026-08-06 12:34:42', '2026-08-06 13:22:05'),
(51, 'App\\Models\\User', 48, 'auth_token', 'ccb990576d3daeb2f11382ebf58238e038ad542fd9c948c7a763b2225a03d536', '[\"*\"]', '2026-08-06 13:24:45', NULL, '2026-08-06 13:13:57', '2026-08-06 13:24:45'),
(52, 'App\\Models\\User', 16, 'auth_token', 'a74f9a3e796668c6f535e564c2b7408f66a6b14f77723470ef7e2e9fc67ca6f4', '[\"*\"]', '2026-08-06 14:14:11', NULL, '2026-08-06 13:25:04', '2026-08-06 14:14:11'),
(53, 'App\\Models\\User', 49, 'auth_token', '0aef5fd471a4f33f45ff0cdf18887bd57345f9deb281cbf6446deb89ec85b883', '[\"*\"]', '2026-08-06 15:22:36', NULL, '2026-08-06 15:21:56', '2026-08-06 15:22:36'),
(54, 'App\\Models\\User', 50, 'auth_token', '4c8d85d9bb48ab70140bb32e67d0ead56b0501c1b089ed2b65e7a483ba97cbb8', '[\"*\"]', '2026-08-06 15:24:55', NULL, '2026-08-06 15:24:37', '2026-08-06 15:24:55'),
(55, 'App\\Models\\User', 51, 'auth_token', 'f39e9965ab82a1ce243a7b7f7d4e41a857cd3c46ba9a141524316e9a21feb9a0', '[\"*\"]', '2026-08-06 15:29:06', NULL, '2026-08-06 15:27:23', '2026-08-06 15:29:06'),
(56, 'App\\Models\\User', 52, 'auth_token', '8583c871d776eba3c58e52c82aab3b0c50e3bb1d3cc663d8c116a1d717884ee7', '[\"*\"]', '2026-08-06 16:17:31', NULL, '2026-08-06 15:30:59', '2026-08-06 16:17:31'),
(57, 'App\\Models\\User', 16, 'auth_token', 'e704506f0f4e36228b2db3db6b38cc7b4c94fea6233fffa94c1f062e6caebe75', '[\"*\"]', '2026-08-06 16:18:42', NULL, '2026-08-06 16:17:42', '2026-08-06 16:18:42'),
(58, 'App\\Models\\User', 49, 'auth_token', '67446b5329374726ff1c07dfa01822a3c45b5ef73f030595f01a95430f32dcbc', '[\"*\"]', '2026-08-06 16:30:27', NULL, '2026-08-06 16:18:53', '2026-08-06 16:30:27'),
(59, 'App\\Models\\User', 16, 'auth_token', 'e84a6c62ecc44a15bebd13300e6245096200b104c24f51260819b21754a8de9a', '[\"*\"]', '2026-08-06 23:59:36', NULL, '2026-08-06 16:30:38', '2026-08-06 23:59:36'),
(60, 'App\\Models\\User', 16, 'auth_token', '0e0d45898332bd6706c54a432a135ccd8ea4b29dcfb6c2819613ee92c9534a2a', '[\"*\"]', '2026-08-07 00:24:44', NULL, '2026-08-07 00:00:13', '2026-08-07 00:24:44'),
(61, 'App\\Models\\User', 53, 'auth_token', '33e85edfca8acc591af2401eb0405a94988c1b1b2f3d3f872a804f7e250129c0', '[\"*\"]', '2026-08-07 00:32:47', NULL, '2026-08-07 00:27:54', '2026-08-07 00:32:47'),
(62, 'App\\Models\\User', 54, 'auth_token', '800ead6ea398457d1c45832d81b5098aff4ecc841cc0c882b320a0c4ffdc54c4', '[\"*\"]', '2026-08-07 00:35:22', NULL, '2026-08-07 00:35:11', '2026-08-07 00:35:22'),
(63, 'App\\Models\\User', 55, 'auth_token', 'badb97715aa65e8ee46bce70aa7e95e8f901e37d8a004f80b700cfe0ddf79cac', '[\"*\"]', '2026-08-07 00:38:12', NULL, '2026-08-07 00:37:49', '2026-08-07 00:38:12'),
(64, 'App\\Models\\User', 56, 'auth_token', '3e51cf59e263c34e65d2c86d4792f59597ac0deff1836f938a3a3a4ac960328a', '[\"*\"]', '2026-08-07 00:41:07', NULL, '2026-08-07 00:40:49', '2026-08-07 00:41:07'),
(65, 'App\\Models\\User', 16, 'auth_token', 'aedf69938df81d549f807a7b90f22be1c2cdde67523561418573aad64870de77', '[\"*\"]', '2026-08-07 11:13:46', NULL, '2026-08-07 00:41:20', '2026-08-07 11:13:46'),
(66, 'App\\Models\\User', 40, 'auth_token', '304a4ddeeeb8e3eed6dec84930ef89d759e579b40ae524da6d67f916d348e670', '[\"*\"]', '2026-08-07 06:28:13', NULL, '2026-08-07 06:26:56', '2026-08-07 06:28:13'),
(67, 'App\\Models\\User', 16, 'auth_token', 'd2a85d50786bc3b6f6dbedc166ad485c3687a784d55b68c21b88daebacee991e', '[\"*\"]', '2026-08-07 08:47:07', NULL, '2026-08-07 06:31:05', '2026-08-07 08:47:07'),
(68, 'App\\Models\\User', 54, 'auth_token', '3046d87b76605f89dc3e15a6c2d0618fd30f69fdaf993ae817ad1182d31b188a', '[\"*\"]', '2026-08-07 08:48:01', NULL, '2026-08-07 08:47:21', '2026-08-07 08:48:01'),
(69, 'App\\Models\\User', 53, 'auth_token', 'e951bb3664baa43f2de91af02865b54aeee81103f4e93c9dc2d3a80d65fb3bb0', '[\"*\"]', '2026-08-07 08:50:53', NULL, '2026-08-07 08:48:15', '2026-08-07 08:50:53'),
(70, 'App\\Models\\User', 16, 'auth_token', 'cc8e0f5c6af2c062d9b97ea03b10b7ffc39f5a6a6c0d4504764e1c1a9a6c20dc', '[\"*\"]', '2026-08-07 08:54:39', NULL, '2026-08-07 08:51:08', '2026-08-07 08:54:39'),
(71, 'App\\Models\\User', 53, 'auth_token', 'cd93256e3c040c99f2a63aee2f80b5161ec2d3d71e78e7f200f4041b201a9557', '[\"*\"]', '2026-08-07 08:55:10', NULL, '2026-08-07 08:54:49', '2026-08-07 08:55:10'),
(72, 'App\\Models\\User', 54, 'auth_token', 'f8650be2fadf6a1eaf466580a84bbf04e31f6c4be50b3eff131155a8eca2ba3c', '[\"*\"]', '2026-08-07 08:55:56', NULL, '2026-08-07 08:55:24', '2026-08-07 08:55:56'),
(73, 'App\\Models\\User', 16, 'auth_token', '1dd249d74f2f1369511513728cf3f82685087e0313c86d6b268f92702f2c53a3', '[\"*\"]', '2026-08-07 09:05:53', NULL, '2026-08-07 08:56:26', '2026-08-07 09:05:53'),
(74, 'App\\Models\\User', 53, 'auth_token', '06f744a3d51e51896e50dce69367ed5401e662911b72b07716cfbfb01ea670b9', '[\"*\"]', '2026-08-07 09:47:53', NULL, '2026-08-07 09:06:06', '2026-08-07 09:47:53'),
(75, 'App\\Models\\User', 16, 'auth_token', 'aadd7ac3149e062dbcadab2f950fa69f68c09c448015de689e0a2a05245b4b37', '[\"*\"]', '2026-08-07 10:59:56', NULL, '2026-08-07 09:48:09', '2026-08-07 10:59:56'),
(76, 'App\\Models\\User', 40, 'auth_token', 'e86e08c3a26045193e0d33e20b6d8052dee6aab8c1dceca3845c9e075b39a429', '[\"*\"]', '2026-08-07 11:08:57', NULL, '2026-08-07 11:00:08', '2026-08-07 11:08:57'),
(77, 'App\\Models\\User', 53, 'auth_token', 'fa38fb79d0be3b67763045d65ce8eeb637b067a22167fc1ef169114d56b25c39', '[\"*\"]', '2026-08-07 11:09:21', NULL, '2026-08-07 11:08:53', '2026-08-07 11:09:21'),
(78, 'App\\Models\\User', 16, 'auth_token', '7203a866e997b1bf60d69f30a1bafd35d92e8a7ed43239b6cf0db296686b9b29', '[\"*\"]', '2026-08-07 11:27:32', NULL, '2026-08-07 11:09:39', '2026-08-07 11:27:32'),
(79, 'App\\Models\\User', 54, 'auth_token', '66be4409b5f69752844ae19ae64b1a5427229830999c9df758ad07b371f33523', '[\"*\"]', '2026-08-07 11:28:58', NULL, '2026-08-07 11:27:48', '2026-08-07 11:28:58'),
(80, 'App\\Models\\User', 16, 'auth_token', 'e19a8a9b182ea21c1e1453009679bd74b0ac286ae88cfbadd40cffb1c56c4719', '[\"*\"]', '2026-08-07 11:33:56', NULL, '2026-08-07 11:29:25', '2026-08-07 11:33:56');

-- --------------------------------------------------------

--
-- Table structure for table `profile_photos`
--

CREATE TABLE `profile_photos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `photo_url` varchar(255) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `profile_photos`
--

INSERT INTO `profile_photos` (`id`, `user_id`, `photo_url`, `is_primary`, `sort_order`, `created_at`, `updated_at`) VALUES
(932, 2, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800', 1, 0, '2026-07-28 01:05:41', '2026-07-28 01:05:41'),
(933, 2, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', 0, 1, '2026-07-28 01:05:41', '2026-07-28 01:05:41'),
(934, 2, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', 0, 2, '2026-07-28 01:05:41', '2026-07-28 01:05:41'),
(954, 11, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800', 1, 0, '2026-07-28 01:05:44', '2026-07-28 01:05:44'),
(955, 11, 'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=800', 0, 1, '2026-07-28 01:05:44', '2026-07-28 01:05:44'),
(980, 32, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', 1, 0, '2026-07-28 01:05:49', '2026-07-28 01:05:49'),
(981, 32, 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800', 0, 1, '2026-07-28 01:05:49', '2026-07-28 01:05:49'),
(1192, 48, 'https://support.ajaywatpade.in/uploads/user_prem/1786022037_LktNdowvsB.jpg', 1, 0, '2026-08-06 13:24:39', '2026-08-06 13:24:39'),
(1193, 48, 'https://support.ajaywatpade.in/uploads/user_prem/1786022037_IadfCMJRqA.jpg', 0, 1, '2026-08-06 13:24:39', '2026-08-06 13:24:39'),
(1194, 48, 'https://support.ajaywatpade.in/uploads/user_prem/1786022037_Lv6SXBhyHR.png', 0, 2, '2026-08-06 13:24:39', '2026-08-06 13:24:39'),
(1201, 49, 'https://support.ajaywatpade.in/uploads/user_49/1786029739_O7kgfqWdQ9.jpg', 1, 0, '2026-08-06 15:22:32', '2026-08-06 15:22:32'),
(1202, 49, 'https://support.ajaywatpade.in/uploads/user_priyanka/1786029716_0VNkNTXdhK.jpg', 0, 1, '2026-08-06 15:22:32', '2026-08-06 15:22:32'),
(1206, 50, 'https://support.ajaywatpade.in/uploads/user_ashwini/1786029877_JNiO8qv8H3.jpg', 1, 0, '2026-08-06 15:24:44', '2026-08-06 15:24:44'),
(1207, 50, 'https://support.ajaywatpade.in/uploads/user_ashwini/1786029877_FWGeaT89C2.jpg', 0, 1, '2026-08-06 15:24:44', '2026-08-06 15:24:44'),
(1208, 50, 'https://support.ajaywatpade.in/uploads/user_ashwini/1786029877_7KbSQuDPZQ.jpg', 0, 2, '2026-08-06 15:24:44', '2026-08-06 15:24:44'),
(1225, 51, 'https://support.ajaywatpade.in/uploads/user_51/1786030117_ppPNA1xFy9.jpg', 1, 0, '2026-08-06 15:28:59', '2026-08-06 15:28:59'),
(1226, 51, 'https://support.ajaywatpade.in/uploads/user_51/1786030135_rkUB4m8kBJ.jpg', 0, 1, '2026-08-06 15:28:59', '2026-08-06 15:28:59'),
(1227, 51, 'https://support.ajaywatpade.in/uploads/user_51/1786030125_L0GkXgW1Mv.jpg', 0, 2, '2026-08-06 15:28:59', '2026-08-06 15:28:59'),
(1228, 51, 'https://support.ajaywatpade.in/uploads/user_51/1786030106_O2lSIroFl9.jpg', 0, 3, '2026-08-06 15:28:59', '2026-08-06 15:28:59'),
(1232, 52, 'https://support.ajaywatpade.in/uploads/user_52/1786033025_KVE4D9GyoI.jpg', 1, 0, '2026-08-06 16:17:10', '2026-08-06 16:17:10'),
(1239, 53, 'https://support.ajaywatpade.in/uploads/user_53/1786062511_zpLRO5LJsJ.jpg', 1, 0, '2026-08-07 00:28:35', '2026-08-07 00:28:35'),
(1240, 54, 'https://support.ajaywatpade.in/uploads/user_riya/1786062911_WEK5TmGQjy.jpg', 1, 0, '2026-08-07 00:35:11', '2026-08-07 00:35:11'),
(1241, 54, 'https://support.ajaywatpade.in/uploads/user_riya/1786062910_ixbTM9pPUo.jpg', 0, 1, '2026-08-07 00:35:11', '2026-08-07 00:35:11'),
(1242, 54, 'https://support.ajaywatpade.in/uploads/user_riya/1786062911_uvjfF0HJq7.jpg', 0, 2, '2026-08-07 00:35:11', '2026-08-07 00:35:11'),
(1243, 55, 'https://support.ajaywatpade.in/uploads/user_sakshi/1786063068_3fs5eChrob.jpg', 1, 0, '2026-08-07 00:37:49', '2026-08-07 00:37:49'),
(1244, 55, 'https://support.ajaywatpade.in/uploads/user_sakshi/1786063068_2Qk4rFoLju.jpg', 0, 1, '2026-08-07 00:37:49', '2026-08-07 00:37:49'),
(1245, 56, 'https://support.ajaywatpade.in/uploads/user_priya/1786063249_Zmb3wQmrfn.jpg', 1, 0, '2026-08-07 00:40:49', '2026-08-07 00:40:49'),
(1246, 56, 'https://support.ajaywatpade.in/uploads/user_priya/1786063249_pBYvxRSDWn.jpg', 0, 1, '2026-08-07 00:40:49', '2026-08-07 00:40:49'),
(1247, 56, 'https://support.ajaywatpade.in/uploads/user_priya/1786063249_bU0CiTMSim.jpg', 0, 2, '2026-08-07 00:40:49', '2026-08-07 00:40:49'),
(1266, 40, 'https://support.ajaywatpade.in/uploads/user_40/1786084059_HKtjjopR12.png', 1, 0, '2026-08-07 06:28:09', '2026-08-07 06:28:09'),
(1267, 40, 'https://support.ajaywatpade.in/uploads/user_40/1786084070_TymM34vYRh.png', 0, 1, '2026-08-07 06:28:09', '2026-08-07 06:28:09'),
(1268, 40, 'https://support.ajaywatpade.in/uploads/user_40/1786019827_F9MYsP104r.jpg', 0, 2, '2026-08-07 06:28:09', '2026-08-07 06:28:09'),
(1269, 40, 'https://support.ajaywatpade.in/uploads/user_40/1786019743_bOO6cXNrPl.jpg', 0, 3, '2026-08-07 06:28:09', '2026-08-07 06:28:09'),
(1280, 16, 'https://support.ajaywatpade.in/uploads/user_16/1786082801_45AKHIyJa5.jpg', 1, 0, '2026-08-07 09:54:52', '2026-08-07 09:54:52'),
(1281, 16, 'https://support.ajaywatpade.in/uploads/user_16/1786018800_j4a8Tde1Js.png', 0, 1, '2026-08-07 09:54:52', '2026-08-07 09:54:52');

-- --------------------------------------------------------

--
-- Table structure for table `restaurants`
--

CREATE TABLE `restaurants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `rating` decimal(3,1) NOT NULL DEFAULT 4.5,
  `location` varchar(255) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price_range` varchar(255) NOT NULL DEFAULT '$$',
  `map_url` varchar(255) DEFAULT NULL,
  `is_boosted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `restaurants`
--

INSERT INTO `restaurants` (`id`, `name`, `category`, `rating`, `location`, `image`, `description`, `price_range`, `map_url`, `is_boosted`, `created_at`, `updated_at`) VALUES
(1, 'LUMA Rooftop Lounge', 'Cocktail Bar & Tapas', 4.9, 'Downtown Waterfront', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'Panoramic skyline views, crafted botanical cocktails, and live jazz vibes under starry skies. Perfect for a first date or anniversary.', '$$$', 'https://maps.google.com/?q=LUMA+Rooftop+Chicago', 0, '2026-07-20 23:40:43', '2026-07-20 23:40:43'),
(2, 'Aura Garden Bistro', 'Organic Italian', 4.8, 'West Loop Arts District', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'Enchanted courtyard dining with glowing fairy lights, handmade pasta, and organic wine pairings.', '$$', 'https://maps.google.com/?q=Aura+Garden+Bistro', 0, '2026-07-20 23:40:43', '2026-07-20 23:40:43'),
(3, 'Velvet & Smoke', 'Speakeasy & Steakhouse', 4.7, 'Old Town Historic', 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800', 'Hidden entrance behind a bookshelf. Dim plush leather booths and artisan smoked bourbon cocktails.', '$$$$', 'https://maps.google.com/?q=Velvet+Smoke+Chicago', 0, '2026-07-20 23:40:43', '2026-07-20 23:40:43'),
(4, 'La Maison du Soir', 'French Fine Dining', 4.9, 'Gold Coast', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', 'Classic French haute cuisine in an intimate setting with candle-lit tables and a sommelier on staff.', '$$$$', 'https://maps.google.com/?q=La+Maison+du+Soir+Chicago', 0, '2026-07-20 23:40:43', '2026-07-20 23:40:43'),
(5, 'Sakura Omakase Bar', 'Japanese Omakase', 5.0, 'River North', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', 'Chef-curated 12-course sushi experience with seasonal imports from Tsukiji. Intimate counter seating for two.', '$$$$', 'https://maps.google.com/?q=Sakura+Omakase+Chicago', 0, '2026-07-20 23:40:43', '2026-07-20 23:40:43'),
(6, 'The Lantern Terrace', 'Mediterranean Rooftop', 4.6, 'Lincoln Park', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', 'Open-air Mediterranean mezze under hanging lanterns. Warm spices, chilled rose, and live oud music on Fridays.', '$$$', 'https://maps.google.com/?q=The+Lantern+Terrace+Chicago', 1, '2026-07-20 23:40:43', '2026-07-20 23:40:43'),
(7, 'Starlight Skybar & Lounge', 'Cosmic Rooftop & Mixology', 5.0, 'Marina Bay Waterfront', 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800', 'Ultra-luxe rooftop deck with stargazing telescopes and signature molecular cocktails.', '', NULL, 1, '2026-07-23 00:11:37', '2026-07-23 00:11:37');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('0vcEYRPR6OeDOqFYTudiM0rFseVhrykea2iaCMiH', NULL, '192.168.1.41', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiOG1ZT0hoR3UyUXpaZ2tqVWQ3UkwzdHFFMDRPMjd2N2xDYkpEb2xMNiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MTc3OiJodHRwOi8vMTkyLjE2OC4xLjQwOjgwMDAvcGF5bWVudC9jaGVja291dD9hbW91bnQ9MTE3JmR1cmF0aW9uPTElMjBNb250aCZvcmRlcl9pZD1vcmRlcl9USkM5SFc0TTRleml5ZyZwbGFuX25hbWU9YmFzaWMmdG9rZW49MTMlN0N2WUhTN0NBTHN1U0wzSmhmVnFiWU1qejhnMnJybFZXWDFnQ05Helh2ZTUyMGJmOTMiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1785301160),
('Axf6osumgUXQTwafVvHffTc2OqdTQAQlWdFE17yK', NULL, '192.168.1.41', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiQzR5YVpUV3hxTE9RR0o5eExCVDNTQlljWE1Hd1k5dnpmTFptc0drTiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MTc4OiJodHRwOi8vMTkyLjE2OC4xLjQwOjgwMDAvcGF5bWVudC9jaGVja291dD9hbW91bnQ9NjAwJmR1cmF0aW9uPTYlMjBNb250aHMmb3JkZXJfaWQ9b3JkZXJfVElWNVpaNlhqcWRFZlYmcGxhbl9uYW1lPWJhc2ljJnRva2VuPTEzJTdDdllIUzdDQUxzdVNMM0poZlZxYllNano4ZzJycmxWV1gxZ0NOR3pYdmU1MjBiZjkzIjtzOjU6InJvdXRlIjtOO31zOjY6Il9mbGFzaCI7YToyOntzOjM6Im9sZCI7YTowOnt9czozOiJuZXciO2E6MDp7fX19', 1785149522),
('U4LuUDY1gixo5Q6UUs0vNNO23X0QiyXVTlZ5Hz99', NULL, '192.168.1.35', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiMGxBeEtRM0J4b2VpbU9kZ3VGWHpIdEZNTHRMR21Ed0tMVENMZFdWUCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MTc3OiJodHRwOi8vMTkyLjE2OC4xLjQwOjgwMDAvcGF5bWVudC9jaGVja291dD9hbW91bnQ9NjAwJmR1cmF0aW9uPTYlMjBNb250aHMmb3JkZXJfaWQ9b3JkZXJfVElWSzVWTGRzOUtnbWgmcGxhbl9uYW1lPWJhc2ljJnRva2VuPTUlN0NmVFp5MEN2WlJROFpHQkh2emxPM1JISEVLWEIyWDUxQ2RXVVRZRkN2OWM5MDQzODYiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1785150349),
('yQc6Qd3VzWUV7DMdIYOHV9bwgk2PSDq98PDWUqOW', NULL, '192.168.1.42', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoidmI1V29TWm93ZFFIOEtFUFVUT1lTbGJwSmc0Uk5XY2VndDc2V0plcyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MTc3OiJodHRwOi8vMTkyLjE2OC4xLjQwOjgwMDAvcGF5bWVudC9jaGVja291dD9hbW91bnQ9NjAwJmR1cmF0aW9uPTYlMjBNb250aHMmb3JkZXJfaWQ9b3JkZXJfVElvOXFiOTdRcnFZNXYmcGxhbl9uYW1lPWJhc2ljJnRva2VuPTUlN0NmVFp5MEN2WlJROFpHQkh2emxPM1JISEVLWEIyWDUxQ2RXVVRZRkN2OWM5MDQzODYiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1785216676);

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

CREATE TABLE `subscription_plans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `plan_key` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `tagline` varchar(255) NOT NULL,
  `icon_name` varchar(255) NOT NULL,
  `badge_text` varchar(255) NOT NULL,
  `accent_color` varchar(255) NOT NULL,
  `gradient` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`gradient`)),
  `glow_color` varchar(255) NOT NULL,
  `durations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`durations`)),
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`features`)),
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `plan_key`, `name`, `tagline`, `icon_name`, `badge_text`, `accent_color`, `gradient`, `glow_color`, `durations`, `features`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'basic', 'HeartLink Basic', 'Essential Match & Profile Tools', 'flash-outline', 'BASIC PLAN', '#06B6D4', '[\"#06B6D4\",\"#3B82F6\"]', 'rgba(6, 182, 212, 0.22)', '[{\"id\":\"12m\",\"label\":\"1 Year\",\"price\":\"\\u20b918\",\"unit\":\"\\/wk\",\"total\":\"\\u20b9864\",\"save\":\"38% OFF\"},{\"id\":\"6m\",\"label\":\"6 Months\",\"price\":\"\\u20b925\",\"unit\":\"\\/wk\",\"total\":\"\\u20b9600\",\"save\":\"15% OFF\",\"popular\":true},{\"id\":\"1m\",\"label\":\"1 Month\",\"price\":\"\\u20b929.2\",\"unit\":\"\\/wk\",\"total\":\"\\u20b9117\",\"save\":\"STANDARD\"}]', '[{\"icon\":\"heart-outline\",\"title\":\"10 Profile Likes Daily (24h Reset)\"},{\"icon\":\"close-outline\",\"title\":\"20 Profile Passes Daily (24h Reset)\"},{\"icon\":\"reload-outline\",\"title\":\"Recheck Up to 3 Passed Profiles\"},{\"icon\":\"chatbubbles-outline\",\"title\":\"Unlimited Chatting with Matches\"},{\"icon\":\"mail-unread-outline\",\"title\":\"Unlimited Incoming Match Requests\"},{\"icon\":\"rocket-outline\",\"title\":\"3 Profile Priority Boosts per Month\"},{\"icon\":\"options-outline\",\"title\":\"Access to Preference Filters in Discover\"}]', 1, 1, '2026-07-27 01:56:08', '2026-07-27 01:56:08'),
(2, 'plus', 'HeartLink Plus', 'Expanded Reach & Superlikes', 'star-outline', 'MOST POPULAR', '#F59E0B', '[\"#F59E0B\",\"#D97706\"]', 'rgba(245, 158, 11, 0.25)', '[{\"id\":\"12m\",\"label\":\"1 Year\",\"price\":\"\\u20b943\",\"unit\":\"\\/wk\",\"total\":\"\\u20b92,064\",\"save\":\"20% OFF\"},{\"id\":\"6m\",\"label\":\"6 Months\",\"price\":\"\\u20b949\",\"unit\":\"\\/wk\",\"total\":\"\\u20b91,176\",\"save\":\"8% OFF\",\"popular\":true},{\"id\":\"1m\",\"label\":\"1 Month\",\"price\":\"\\u20b953.5\",\"unit\":\"\\/wk\",\"total\":\"\\u20b9214\",\"save\":\"FLEX\"}]', '[{\"icon\":\"heart-outline\",\"title\":\"20 Profile Likes Daily (24h Reset)\"},{\"icon\":\"close-outline\",\"title\":\"30 Profile Passes Daily (24h Reset)\"},{\"icon\":\"reload-outline\",\"title\":\"Recheck Up to 10 Passed Profiles\"},{\"icon\":\"chatbubbles-outline\",\"title\":\"Unlimited Chatting with Matches\"},{\"icon\":\"flash-outline\",\"title\":\"5 Superlikes per Month\"},{\"icon\":\"mail-unread-outline\",\"title\":\"Unlimited Incoming Match Requests\"},{\"icon\":\"rocket-outline\",\"title\":\"5 Profile Priority Boosts per Month\"},{\"icon\":\"options-outline\",\"title\":\"Access to Preference Filters in Discover\"}]', 2, 1, '2026-07-27 01:56:08', '2026-07-27 01:56:08'),
(3, 'premium', 'HeartLink Premium', 'Unlimited Swipes, Golden Tick & Daily Boost', 'sparkles-outline', 'ULTIMATE PREMIUM', '#FF007F', '[\"#FF007F\",\"#8B5CF6\"]', 'rgba(255, 0, 127, 0.28)', '[{\"id\":\"12m\",\"label\":\"1 Year\",\"price\":\"\\u20b970\",\"unit\":\"\\/wk\",\"total\":\"\\u20b93,360\",\"save\":\"29% OFF\"},{\"id\":\"6m\",\"label\":\"6 Months\",\"price\":\"\\u20b983\",\"unit\":\"\\/wk\",\"total\":\"\\u20b91,992\",\"save\":\"16% OFF\",\"popular\":true},{\"id\":\"1m\",\"label\":\"1 Month\",\"price\":\"\\u20b999\",\"unit\":\"\\/wk\",\"total\":\"\\u20b9396\",\"save\":\"ULTIMATE\"}]', '[{\"icon\":\"infinite-outline\",\"title\":\"Unlimited Daily Likes & Passes\"},{\"icon\":\"reload-outline\",\"title\":\"Recheck Unlimited Passed Profiles\"},{\"icon\":\"chatbubbles-outline\",\"title\":\"Unlimited Chatting with Matches\"},{\"icon\":\"checkmark-circle-outline\",\"title\":\"Special Golden Tick Badge on Profile\"},{\"icon\":\"flash-outline\",\"title\":\"15 Superlikes per Month\"},{\"icon\":\"rocket-outline\",\"title\":\"Daily Top Feed Profile Priority Boost\"},{\"icon\":\"mail-unread-outline\",\"title\":\"Unlimited Incoming Match Requests\"},{\"icon\":\"options-outline\",\"title\":\"Access to Preference Filters in Discover\"}]', 3, 1, '2026-07-27 01:56:08', '2026-07-27 01:56:08');

-- --------------------------------------------------------

--
-- Table structure for table `swipes`
--

CREATE TABLE `swipes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `swiper_id` bigint(20) UNSIGNED NOT NULL,
  `swiped_user_id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('like','pass','super_like') NOT NULL DEFAULT 'like',
  `is_declined_by_receiver` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `swipes`
--

INSERT INTO `swipes` (`id`, `swiper_id`, `swiped_user_id`, `type`, `is_declined_by_receiver`, `created_at`, `updated_at`) VALUES
(1226, 16, 56, 'pass', 0, '2026-08-07 08:54:25', '2026-08-07 08:54:25'),
(1227, 16, 55, 'pass', 0, '2026-08-07 08:54:27', '2026-08-07 08:54:27'),
(1231, 54, 48, 'pass', 0, '2026-08-07 08:55:42', '2026-08-07 08:55:42'),
(1232, 54, 16, 'like', 0, '2026-08-07 08:55:47', '2026-08-07 08:55:47'),
(1233, 16, 54, 'like', 0, '2026-08-07 08:56:34', '2026-08-07 08:56:34'),
(1234, 16, 53, 'pass', 0, '2026-08-07 10:26:47', '2026-08-07 10:26:47'),
(1235, 16, 52, 'pass', 0, '2026-08-07 10:50:06', '2026-08-07 10:50:06'),
(1236, 16, 51, 'pass', 0, '2026-08-07 10:50:15', '2026-08-07 10:50:15'),
(1237, 16, 50, 'pass', 0, '2026-08-07 10:50:18', '2026-08-07 10:50:18');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `country_code` varchar(10) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `age` int(11) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `mother_tongue` varchar(255) DEFAULT NULL,
  `languages_spoken` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`languages_spoken`)),
  `religion` varchar(255) DEFAULT NULL,
  `marital_status` varchar(255) DEFAULT NULL,
  `education` varchar(255) DEFAULT NULL,
  `occupation` varchar(255) DEFAULT NULL,
  `diet` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `vibe` varchar(255) DEFAULT NULL,
  `job` varchar(255) DEFAULT NULL,
  `avatar` text DEFAULT NULL,
  `video_intro_url` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `relationship_type` varchar(255) DEFAULT NULL,
  `zodiac_sign` varchar(255) DEFAULT NULL,
  `drinking` varchar(255) DEFAULT NULL,
  `smoking` varchar(255) DEFAULT NULL,
  `clubbing` varchar(255) DEFAULT NULL,
  `exercise` varchar(255) DEFAULT NULL,
  `age_min` int(11) NOT NULL DEFAULT 18,
  `age_max` int(11) NOT NULL DEFAULT 50,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT 1,
  `expo_push_token` varchar(255) DEFAULT NULL,
  `compatibility_score` int(11) NOT NULL DEFAULT 90,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `aadhaar_number` varchar(255) DEFAULT NULL,
  `subscription_plan` varchar(255) NOT NULL DEFAULT 'Free',
  `daily_likes_count` int(11) NOT NULL DEFAULT 0,
  `daily_passes_count` int(11) NOT NULL DEFAULT 0,
  `last_swipe_reset_at` timestamp NULL DEFAULT NULL,
  `monthly_superlikes_count` int(11) NOT NULL DEFAULT 0,
  `purchased_superlikes_count` int(11) NOT NULL DEFAULT 0,
  `monthly_boosts_count` int(11) NOT NULL DEFAULT 0,
  `last_boost_reset_at` timestamp NULL DEFAULT NULL,
  `rewinds_count` int(11) NOT NULL DEFAULT 0,
  `interests` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`interests`)),
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `display_name`, `email`, `phone`, `phone_number`, `country_code`, `email_verified_at`, `password`, `age`, `dob`, `gender`, `mother_tongue`, `languages_spoken`, `religion`, `marital_status`, `education`, `occupation`, `diet`, `bio`, `vibe`, `job`, `avatar`, `video_intro_url`, `city`, `state`, `country`, `pincode`, `relationship_type`, `zodiac_sign`, `drinking`, `smoking`, `clubbing`, `exercise`, `age_min`, `age_max`, `latitude`, `longitude`, `is_online`, `expo_push_token`, `compatibility_score`, `is_verified`, `aadhaar_number`, `subscription_plan`, `daily_likes_count`, `daily_passes_count`, `last_swipe_reset_at`, `monthly_superlikes_count`, `purchased_superlikes_count`, `monthly_boosts_count`, `last_boost_reset_at`, `rewinds_count`, `interests`, `remember_token`, `created_at`, `updated_at`) VALUES
(2, 'Anjali Sharma', NULL, 'anjali@heartlink.com', NULL, NULL, NULL, NULL, '$2y$12$nlsXBCGcXs59h/rz3e0d/OLDiy2.FqKtavtfyGZjALAiSLXMibW42', 23, NULL, 'Female', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Passionate about literature, yoga, and exploring street food. Looking for someone who matches my vibe.', 'Tech & Dev', 'Content Creator', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500', NULL, 'Mumbai', 'MH', 'India', NULL, 'Long-term relationship', NULL, NULL, NULL, NULL, NULL, 18, 50, NULL, NULL, 1, NULL, 93, 1, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '\"[\\\"Literature\\\",\\\"Yoga\\\",\\\"Street Food\\\",\\\"Travel\\\",\\\"Music\\\",\\\"Tech & Dev\\\"]\"', NULL, '2026-07-20 23:40:40', '2026-07-24 04:49:46'),
(11, 'Emma Watson', NULL, 'emma@example.com', NULL, NULL, NULL, NULL, '$2y$12$ytxoorWtEL3//Fq154Ma7u6BbIu8S.YptyOc3/jDj1JLuNwJrivOi', 25, NULL, 'Female', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Exploring nature trails, reading classic novels, and sipping chai on rainy afternoons.', 'Nature Peak', 'Environmental Scientist', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800', NULL, 'Chicago', 'IL', 'USA', NULL, 'Long-term relationship', NULL, NULL, NULL, NULL, NULL, 18, 50, NULL, NULL, 1, NULL, 96, 0, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '\"[\\\"Nature\\\",\\\"Books\\\",\\\"Chai\\\",\\\"Hiking\\\",\\\"Science\\\",\\\"Nature Peak\\\"]\"', NULL, '2026-07-20 23:40:42', '2026-07-24 04:49:46'),
(16, 'Ajay Ananda Watpade', 'Ajay', 'ajay@gmail.com', NULL, NULL, NULL, '2026-07-28 03:40:33', '$2y$12$vHPPTq8nl2mcS6AoJjgqnuMQhh9b1wk5w4YjYFn5tGltns4cqz6nS', 25, '2000-11-26', 'Male', 'Marathi', NULL, 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Owner', 'Vegetarian', 'Passionate about literature, art, and exploring street food. Looking for someone who matches my vibe.', 'Gamer Zone', 'Owner', 'https://support.ajaywatpade.in/uploads/user_16/1786082801_45AKHIyJa5.jpg', NULL, 'Nashik', 'MH', 'India', NULL, 'Long-term relationship', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 95, 1, '855166824855', 'HeartLink Premium', 51, 475, '2026-07-27 02:03:58', 14, 0, 0, NULL, 48, '[\"Literature\",\"Art\",\"Design\",\"Travel\",\"Music\"]', NULL, '2026-07-20 23:46:46', '2026-08-07 10:50:18'),
(32, 'Jessica Nomad', NULL, 'jessicanomad@example.com', NULL, NULL, NULL, NULL, '$2y$12$lKEeYiNz2UnpwqeeKSiVAur9yQarlqCZL7006FIDjL8Sx1S.X/G0O', 26, NULL, 'Female', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Backpacking across South America, road trips through national parks, and capturing sunsets.', 'Wanderlust', 'Travel Photographer', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', NULL, 'Chicago', 'IL', 'USA', NULL, 'Long-term relationship', NULL, NULL, NULL, NULL, NULL, 18, 50, NULL, NULL, 1, NULL, 96, 0, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '\"[\\\"Travel\\\",\\\"Wanderlust\\\",\\\"Backpacking\\\",\\\"Adventure\\\",\\\"Flight\\\"]\"', NULL, '2026-07-27 06:17:58', '2026-07-27 06:17:58'),
(40, 'Trupti Rameshwar Taskar', 'Sakshi', 'trupti@gmail.com', '2536523652', '2536523652', '+91', '2026-08-06 03:20:31', '$2y$12$vHPPTq8nl2mcS6AoJjgqnuMQhh9b1wk5w4YjYFn5tGltns4cqz6nS', 21, '2004-10-25', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Master\'s Degree', 'Professional', 'Vegetarian', 'Loving life, seeking casual dating. Hobbies include Travel, Photography, Cooking.', 'Gamer Zone', 'Professional', 'https://support.ajaywatpade.in/uploads/user_40/1786084059_HKtjjopR12.png', NULL, 'Nashik', 'Maharashtra', 'India', '422008', 'Marriage', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, '724750424989', 'Free', 1, 10, '2026-08-06 03:11:52', 0, 0, 0, NULL, 0, '[\"Travel\",\"Photography\",\"Cooking\"]', NULL, '2026-08-06 03:07:30', '2026-08-07 06:28:09'),
(48, 'Prem', 'Prem', 'prem@gmail.com', '2536523652', '2536523652', '+91', NULL, '$2y$12$FjELZaiL3W2gw6h8EP/US.k5H2F4PDy2jyLccYs8Lq2Ofh9X6kV6C', 26, '2000-01-19', 'Male', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Professional', 'Vegetarian', 'Loving life, seeking marriage-minded. Hobbies include Photography, Travel, Music.', NULL, 'Professional', 'https://support.ajaywatpade.in/uploads/user_prem/1786022037_LktNdowvsB.jpg', NULL, 'Nashik', 'Maharashtra', 'India', '422008', 'Marriage-minded', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 0, NULL, 'Free', 1, 4, '2026-08-06 13:14:06', 0, 0, 0, NULL, 0, '[\"Photography\",\"Travel\",\"Music\"]', NULL, '2026-08-06 13:13:57', '2026-08-06 13:24:39'),
(49, 'Priyanka Ramesh Sawkar', 'Priyanka', 'priyanka@gmail.com', '1234657890', '1234657890', '+91', NULL, '$2y$12$YfqbmiIQgFvS2QVpYpC4P.8su20UZnzaiNkZaS9kbZ7NQFTUojKpy', 24, '2002-01-17', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Artist', 'Vegetarian', 'Loving life, seeking long-term relationship. Hobbies include Travel, Cooking, Art.', NULL, 'Artist', 'https://support.ajaywatpade.in/uploads/user_49/1786029739_O7kgfqWdQ9.jpg', NULL, 'Mumbai', 'Maharashtra', 'India', '422005', 'Long-term Relationship', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 0, 5, '2026-08-06 16:19:13', 0, 0, 0, NULL, 0, '[\"Travel\",\"Cooking\",\"Art\"]', NULL, '2026-08-06 15:21:56', '2026-08-06 16:19:33'),
(50, 'Ashwini Sadashiv Raut', 'Ash', 'ashwini@gmail.com', '9632584639', '9632584639', '+91', NULL, '$2y$12$/7MGS9brbO8PGjLsx5nn1euv9iFRUBEzvYSIO3Qkao0fvtzfaeg7O', 26, '2000-03-09', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Professional', 'Vegetarian', 'Loving life, seeking long-term relationship. Hobbies include Movies, Technology, Dancing.', NULL, 'Professional', 'https://support.ajaywatpade.in/uploads/user_ashwini/1786029877_JNiO8qv8H3.jpg', NULL, 'Pune', 'Maharashtra', 'India', '420895', 'Long-term Relationship', NULL, 'Socially', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '[\"Movies\",\"Technology\",\"Dancing\"]', NULL, '2026-08-06 15:24:37', '2026-08-06 15:24:44'),
(51, 'Kajal Ramesh Mahale', 'Kaju', 'kajal@gmail.com', '9876543698', '9876543698', '+91', NULL, '$2y$12$PQxNCxF54qqfAdsv1V47G.gOfYgJpeCBqJlvzswzkzUSDcg63mBVy', 22, '2004-01-21', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Software Engineer', 'Vegetarian', 'Loving life, seeking friendship. Hobbies include Fitness, Music, Travel.', NULL, 'Software Engineer', 'https://support.ajaywatpade.in/uploads/user_51/1786030117_ppPNA1xFy9.jpg', NULL, 'Nashik', 'Maharashtra', 'India', '423508', 'Friendship', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '[\"Fitness\",\"Music\",\"Travel\"]', NULL, '2026-08-06 15:27:23', '2026-08-06 15:28:59'),
(52, 'Swati Narendra Aher', 'sweetie', 'swati@gmail.com', '8899675696', '8899675696', '+91', NULL, '$2y$12$AmuFj4sTqJ3/.O14NVWy.eR.yoBZNlvplMQzsjbAii70UUW9VCd3G', 26, '2000-01-22', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'college', 'Vegetarian', 'Loving life, seeking long-term relationship. Hobbies include Reading, Art, Gaming.', NULL, 'college', 'https://support.ajaywatpade.in/uploads/user_52/1786033025_KVE4D9GyoI.jpg', NULL, 'Nashik', 'Maharashtra', 'India', '422009', 'Long-term Relationship', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '[\"Reading\",\"Art\",\"Gaming\"]', NULL, '2026-08-06 15:30:59', '2026-08-06 16:17:06'),
(53, 'Kirti Prakash Subhedar', 'Kirti', 'kirti@gmail.com', '2580963258', '2580963258', '+91', NULL, '$2y$12$CkxEn8dWpBLFwUYjHWdfI.Wci83n2dUuTX6EvZi/FKXvElfm9ip.y', 26, '2000-01-19', 'Female', 'Hindi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Influencer', 'Vegetarian', 'Loving life, seeking casual dating. Hobbies include Dancing, Fashion, Hiking.', NULL, 'Influencer', 'https://support.ajaywatpade.in/uploads/user_53/1786062511_zpLRO5LJsJ.jpg', NULL, 'Alībāg', 'Maharashtra', 'India', '456789', 'Casual Dating', NULL, 'Socially', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 0, 1, '2026-08-07 08:50:45', 0, 0, 0, NULL, 0, '[\"Dancing\",\"Fashion\",\"Hiking\"]', NULL, '2026-08-07 00:27:54', '2026-08-07 08:50:45'),
(54, 'Riya Amar Shete', 'Riyuu', 'riya@gmail.com', '1236985632', '1236985632', '+91', NULL, '$2y$12$ErqEWlbuGmkWfEJrKMbkyuHbchcfQbG6gnMW42A0DG6rnJm628UZa', 24, '2002-01-23', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Professional', 'Vegetarian', 'Loving life, seeking long-term relationship. Hobbies include Fashion, Music, Cooking.', NULL, 'Professional', 'https://support.ajaywatpade.in/uploads/user_riya/1786062911_WEK5TmGQjy.jpg', NULL, 'Mumbai', 'Maharashtra', 'India', '456936', 'Long-term Relationship', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 1, 1, '2026-08-07 08:55:42', 0, 0, 0, NULL, 0, '[\"Fashion\",\"Music\",\"Cooking\"]', NULL, '2026-08-07 00:35:11', '2026-08-07 08:55:47'),
(55, 'Sakshi Sunil Date', 'Sakshu', 'sakshi@gmail.com', '5478965369', '5478965369', '+91', NULL, '$2y$12$s5ecn1tfCNAWrc9W/DS0devhcZxXgjsd.fiX.owi1XX633qpuqLym', 23, '2003-04-23', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Medical Student', 'Non-Vegetarian', 'Loving life, seeking long-term relationship. Hobbies include Art, Reading, Music.', NULL, 'Medical Student', 'https://support.ajaywatpade.in/uploads/user_sakshi/1786063068_3fs5eChrob.jpg', NULL, 'Nashik', 'Maharashtra', 'India', '425086', 'Long-term Relationship', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '[\"Art\",\"Reading\",\"Music\",\"Travel\"]', NULL, '2026-08-07 00:37:49', '2026-08-07 00:37:49'),
(56, 'Priya Anil Desai', 'Priya', 'priya@gmail.com', '5214563256', '5214563256', '+91', NULL, '$2y$12$NbR/J/Ny6lNNuAyuPoOUwejfVdFPJzNGdVTREiATXrvm97x6uL9Tq', 25, '2000-12-05', 'Female', 'Marathi', '[\"Hindi\",\"English\"]', 'Hinduism', 'Never Married', 'Bachelor\'s Degree', 'Job', 'Vegetarian', 'Loving life, seeking long-term relationship. Hobbies include Photography, Music, Coffee.', NULL, 'Job', 'https://support.ajaywatpade.in/uploads/user_priya/1786063249_Zmb3wQmrfn.jpg', NULL, 'Nashik', 'Maharashtra', 'India', '422086', 'Long-term Relationship', NULL, 'Never', 'Never', 'Never', NULL, 18, 50, NULL, NULL, 1, NULL, 90, 1, NULL, 'Free', 0, 0, NULL, 0, 0, 0, NULL, 0, '[\"Photography\",\"Music\",\"Coffee\",\"Sports\"]', NULL, '2026-08-07 00:40:49', '2026-08-07 00:40:49');

-- --------------------------------------------------------

--
-- Table structure for table `user_blocks`
--

CREATE TABLE `user_blocks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `blocker_id` bigint(20) UNSIGNED NOT NULL,
  `blocked_user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_matches`
--

CREATE TABLE `user_matches` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_1_id` bigint(20) UNSIGNED NOT NULL,
  `user_2_id` bigint(20) UNSIGNED NOT NULL,
  `matched_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_matches`
--

INSERT INTO `user_matches` (`id`, `user_1_id`, `user_2_id`, `matched_at`, `created_at`, `updated_at`) VALUES
(63, 16, 40, '2026-08-06 12:45:09', '2026-08-06 12:45:09', '2026-08-06 12:45:09'),
(64, 40, 48, '2026-08-06 13:17:02', '2026-08-06 13:17:02', '2026-08-06 13:17:02'),
(67, 16, 54, '2026-08-07 08:56:34', '2026-08-07 08:56:34', '2026-08-07 08:56:34');

-- --------------------------------------------------------

--
-- Table structure for table `user_reports`
--

CREATE TABLE `user_reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reporter_id` bigint(20) UNSIGNED NOT NULL,
  `reported_user_id` bigint(20) UNSIGNED NOT NULL,
  `reason` varchar(255) NOT NULL,
  `status` enum('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_settings`
--

CREATE TABLE `user_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `notifications_on` tinyint(1) NOT NULL DEFAULT 1,
  `show_age` tinyint(1) NOT NULL DEFAULT 1,
  `show_distance` tinyint(1) NOT NULL DEFAULT 1,
  `show_online_status` tinyint(1) NOT NULL DEFAULT 1,
  `show_occupation` tinyint(1) NOT NULL DEFAULT 1,
  `hide_education` tinyint(1) NOT NULL DEFAULT 0,
  `hide_last_seen` tinyint(1) NOT NULL DEFAULT 0,
  `profile_visibility` varchar(255) NOT NULL DEFAULT 'Public',
  `who_can_message` varchar(255) NOT NULL DEFAULT 'Matches Only',
  `distance_filter` varchar(255) NOT NULL DEFAULT '50 km',
  `age_range_filter` varchar(255) NOT NULL DEFAULT '18 - 35',
  `verified_only` tinyint(1) NOT NULL DEFAULT 0,
  `has_bio_only` tinyint(1) NOT NULL DEFAULT 0,
  `common_interests_only` tinyint(1) NOT NULL DEFAULT 0,
  `education_filter` varchar(255) NOT NULL DEFAULT 'Any',
  `religion_filter` varchar(255) NOT NULL DEFAULT 'Any',
  `language_filter` varchar(255) NOT NULL DEFAULT 'Any',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_settings`
--

INSERT INTO `user_settings` (`id`, `user_id`, `notifications_on`, `show_age`, `show_distance`, `show_online_status`, `show_occupation`, `hide_education`, `hide_last_seen`, `profile_visibility`, `who_can_message`, `distance_filter`, `age_range_filter`, `verified_only`, `has_bio_only`, `common_interests_only`, `education_filter`, `religion_filter`, `language_filter`, `created_at`, `updated_at`) VALUES
(2, 16, 1, 1, 0, 1, 0, 0, 0, 'Public', 'Verified Only', 'Worldwide', 'Any', 0, 0, 1, 'Any', 'Any', 'Any', '2026-07-23 22:49:49', '2026-08-07 00:43:34'),
(7, 40, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Hinduism', 'Marathi', '2026-08-06 03:11:56', '2026-08-06 13:07:17'),
(14, 48, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-06 13:23:46', '2026-08-06 13:23:46'),
(15, 49, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 1, 0, 0, 'Any', 'Any', 'Any', '2026-08-06 15:22:36', '2026-08-06 16:19:28'),
(16, 50, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-06 15:24:54', '2026-08-06 15:24:54'),
(17, 51, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-06 15:29:05', '2026-08-06 15:29:05'),
(18, 52, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-06 16:17:27', '2026-08-06 16:17:27'),
(19, 53, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-07 00:28:44', '2026-08-07 00:28:44'),
(20, 54, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-07 00:35:22', '2026-08-07 00:35:22'),
(21, 55, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-07 00:38:12', '2026-08-07 00:38:12'),
(22, 56, 1, 1, 1, 1, 1, 0, 0, 'Public', 'Everyone', '50 km', '18 - 35', 0, 0, 0, 'Any', 'Any', 'Any', '2026-08-07 00:41:05', '2026-08-07 00:41:05');

-- --------------------------------------------------------

--
-- Table structure for table `user_subscriptions`
--

CREATE TABLE `user_subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `plan_name` varchar(255) NOT NULL,
  `duration` varchar(255) NOT NULL,
  `price` varchar(255) NOT NULL,
  `starts_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','cancelled','expired') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_subscriptions`
--

INSERT INTO `user_subscriptions` (`id`, `user_id`, `plan_name`, `duration`, `price`, `starts_at`, `expires_at`, `status`, `created_at`, `updated_at`) VALUES
(10, 16, 'HeartLink Premium', '6 Months', '₹1,992', '2026-07-29 02:14:25', '2027-01-29 02:14:25', 'cancelled', '2026-07-29 02:14:25', '2026-07-29 02:14:29'),
(11, 16, 'HeartLink Premium', '6 Months', '₹1,992', '2026-07-29 02:14:29', '2027-01-29 02:14:29', 'active', '2026-07-29 02:14:29', '2026-07-29 02:14:29');

-- --------------------------------------------------------

--
-- Table structure for table `vibe_posts`
--

CREATE TABLE `vibe_posts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `vibe_name` varchar(255) NOT NULL,
  `caption` text NOT NULL,
  `image_url` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vibe_posts`
--

INSERT INTO `vibe_posts` (`id`, `user_id`, `vibe_name`, `caption`, `image_url`, `created_at`, `updated_at`) VALUES
(1, 2, 'Late Night Beats', 'Spinning vinyls & lo-fi beats until 2 AM 🎧 What’s your late night go-to playlist?', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800', '2026-07-29 01:44:39', '2026-07-29 01:44:39'),
(10, 11, 'Wanderlust', 'Chasing coastal sunsets & planning the next road trip getaway ✈️🗺️', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', '2026-07-29 01:44:39', '2026-07-29 01:44:39'),
(13, 16, 'Late Night Beats', 'Friends', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', '2026-07-29 03:32:59', '2026-07-29 03:32:59');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aadhaar_verifications`
--
ALTER TABLE `aadhaar_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `aadhaar_verifications_user_id_unique` (`user_id`),
  ADD UNIQUE KEY `aadhaar_verifications_aadhaar_number_unique` (`aadhaar_number`);

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indexes for table `chat_message_counters`
--
ALTER TABLE `chat_message_counters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_message_counters_sender_id_receiver_id_unique` (`sender_id`,`receiver_id`),
  ADD KEY `chat_message_counters_receiver_id_foreign` (`receiver_id`);

--
-- Indexes for table `date_bookings`
--
ALTER TABLE `date_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `date_bookings_proposer_id_foreign` (`proposer_id`),
  ADD KEY `date_bookings_partner_id_foreign` (`partner_id`),
  ADD KEY `date_bookings_restaurant_id_foreign` (`restaurant_id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `messages_sender_id_foreign` (`sender_id`),
  ADD KEY `messages_receiver_id_foreign` (`receiver_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id_foreign` (`user_id`),
  ADD KEY `notifications_from_user_id_foreign` (`from_user_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  ADD KEY `personal_access_tokens_expires_at_index` (`expires_at`);

--
-- Indexes for table `profile_photos`
--
ALTER TABLE `profile_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `profile_photos_user_id_foreign` (`user_id`);

--
-- Indexes for table `restaurants`
--
ALTER TABLE `restaurants`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subscription_plans_plan_key_unique` (`plan_key`);

--
-- Indexes for table `swipes`
--
ALTER TABLE `swipes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `swipes_swiper_id_swiped_user_id_unique` (`swiper_id`,`swiped_user_id`),
  ADD KEY `swipes_swiped_user_id_foreign` (`swiped_user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD UNIQUE KEY `users_aadhaar_number_unique` (`aadhaar_number`);

--
-- Indexes for table `user_blocks`
--
ALTER TABLE `user_blocks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_blocks_blocker_id_blocked_user_id_unique` (`blocker_id`,`blocked_user_id`),
  ADD KEY `user_blocks_blocked_user_id_foreign` (`blocked_user_id`);

--
-- Indexes for table `user_matches`
--
ALTER TABLE `user_matches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_matches_user_1_id_foreign` (`user_1_id`),
  ADD KEY `user_matches_user_2_id_foreign` (`user_2_id`);

--
-- Indexes for table `user_reports`
--
ALTER TABLE `user_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_reports_reporter_id_foreign` (`reporter_id`),
  ADD KEY `user_reports_reported_user_id_foreign` (`reported_user_id`);

--
-- Indexes for table `user_settings`
--
ALTER TABLE `user_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_settings_user_id_unique` (`user_id`);

--
-- Indexes for table `user_subscriptions`
--
ALTER TABLE `user_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_subscriptions_user_id_foreign` (`user_id`);

--
-- Indexes for table `vibe_posts`
--
ALTER TABLE `vibe_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vibe_posts_user_id_foreign` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `aadhaar_verifications`
--
ALTER TABLE `aadhaar_verifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `chat_message_counters`
--
ALTER TABLE `chat_message_counters`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `date_bookings`
--
ALTER TABLE `date_bookings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=443;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=280;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT for table `profile_photos`
--
ALTER TABLE `profile_photos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1282;

--
-- AUTO_INCREMENT for table `restaurants`
--
ALTER TABLE `restaurants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `swipes`
--
ALTER TABLE `swipes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1238;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

--
-- AUTO_INCREMENT for table `user_blocks`
--
ALTER TABLE `user_blocks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_matches`
--
ALTER TABLE `user_matches`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=68;

--
-- AUTO_INCREMENT for table `user_reports`
--
ALTER TABLE `user_reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `user_settings`
--
ALTER TABLE `user_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `user_subscriptions`
--
ALTER TABLE `user_subscriptions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `vibe_posts`
--
ALTER TABLE `vibe_posts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `aadhaar_verifications`
--
ALTER TABLE `aadhaar_verifications`
  ADD CONSTRAINT `aadhaar_verifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_message_counters`
--
ALTER TABLE `chat_message_counters`
  ADD CONSTRAINT `chat_message_counters_receiver_id_foreign` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chat_message_counters_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `date_bookings`
--
ALTER TABLE `date_bookings`
  ADD CONSTRAINT `date_bookings_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `date_bookings_proposer_id_foreign` FOREIGN KEY (`proposer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `date_bookings_restaurant_id_foreign` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_receiver_id_foreign` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_from_user_id_foreign` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `profile_photos`
--
ALTER TABLE `profile_photos`
  ADD CONSTRAINT `profile_photos_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `swipes`
--
ALTER TABLE `swipes`
  ADD CONSTRAINT `swipes_swiped_user_id_foreign` FOREIGN KEY (`swiped_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `swipes_swiper_id_foreign` FOREIGN KEY (`swiper_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_blocks`
--
ALTER TABLE `user_blocks`
  ADD CONSTRAINT `user_blocks_blocked_user_id_foreign` FOREIGN KEY (`blocked_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_blocks_blocker_id_foreign` FOREIGN KEY (`blocker_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_matches`
--
ALTER TABLE `user_matches`
  ADD CONSTRAINT `user_matches_user_1_id_foreign` FOREIGN KEY (`user_1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_matches_user_2_id_foreign` FOREIGN KEY (`user_2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_reports`
--
ALTER TABLE `user_reports`
  ADD CONSTRAINT `user_reports_reported_user_id_foreign` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_reports_reporter_id_foreign` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_settings`
--
ALTER TABLE `user_settings`
  ADD CONSTRAINT `user_settings_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_subscriptions`
--
ALTER TABLE `user_subscriptions`
  ADD CONSTRAINT `user_subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `vibe_posts`
--
ALTER TABLE `vibe_posts`
  ADD CONSTRAINT `vibe_posts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
