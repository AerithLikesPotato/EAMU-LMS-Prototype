-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 23, 2026 at 04:16 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lms_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `Admin_ID` int(8) NOT NULL,
  `Admin_Name` varchar(100) NOT NULL,
  `Admin_Email` varchar(100) NOT NULL,
  `Admin_Password` varchar(255) NOT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`Admin_ID`, `Admin_Name`, `Admin_Email`, `Admin_Password`, `Created_At`) VALUES
(1, 'Administrator', 'admin@eamu.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2026-02-23 21:51:53');

-- --------------------------------------------------------

--
-- Table structure for table `answer`
--

CREATE TABLE `answer` (
  `Answer_ID` int(8) NOT NULL,
  `Answer_Text` varchar(500) DEFAULT NULL,
  `Answer_Subm_Date` datetime DEFAULT current_timestamp(),
  `Is_Correct` tinyint(1) DEFAULT 0,
  `Subm_ID` int(8) NOT NULL,
  `Question_ID` int(8) NOT NULL,
  `Option_ID` int(8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment`
--

CREATE TABLE `assignment` (
  `Assign_ID` int(8) NOT NULL,
  `Assign_Title` varchar(500) NOT NULL,
  `Assign_Desc` varchar(1000) DEFAULT NULL,
  `Assign_Release_Date` date DEFAULT NULL,
  `Assign_Due_Date` date DEFAULT NULL,
  `Assign_Points` int(5) DEFAULT 100,
  `Course_ID` int(8) NOT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `certificate`
--

CREATE TABLE `certificate` (
  `Cert_ID` int(8) NOT NULL,
  `Cert_Code` varchar(50) NOT NULL,
  `Issue_Date` date DEFAULT curdate(),
  `Cert_Status` enum('active','revoked','expired') DEFAULT 'active',
  `Stu_ID` int(8) NOT NULL,
  `Course_ID` int(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course`
--

CREATE TABLE `course` (
  `Course_ID` int(8) NOT NULL,
  `Course_Title` varchar(300) NOT NULL,
  `Course_Desc` varchar(1000) DEFAULT NULL,
  `Course_Module` varchar(100) DEFAULT NULL,
  `Course_Assigned_Date` date DEFAULT NULL,
  `Course_Accessed_Date` date DEFAULT NULL,
  `Course_Due_Date` date DEFAULT NULL,
  `Course_Image` varchar(500) DEFAULT NULL,
  `Course_Status` enum('active','inactive','archived') DEFAULT 'active',
  `Lec_ID` int(8) NOT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `enrollment`
--

CREATE TABLE `enrollment` (
  `Enroll_ID` int(8) NOT NULL,
  `Stu_ID` int(8) NOT NULL,
  `Course_ID` int(8) NOT NULL,
  `Enroll_Date` date DEFAULT curdate(),
  `Enroll_Status` enum('active','completed','dropped') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lecturer`
--

CREATE TABLE `lecturer` (
  `Lec_ID` int(8) NOT NULL,
  `Lec_Name` varchar(100) NOT NULL,
  `Lec_Gender` varchar(10) DEFAULT NULL,
  `Lec_Subject` varchar(100) DEFAULT NULL,
  `Lec_Phone` varchar(20) DEFAULT NULL,
  `Lec_Email` varchar(100) NOT NULL,
  `Lec_Password` varchar(255) NOT NULL,
  `Lec_Status` enum('active','inactive') DEFAULT 'active',
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lecturer`
--

INSERT INTO `lecturer` (`Lec_ID`, `Lec_Name`, `Lec_Gender`, `Lec_Subject`, `Lec_Phone`, `Lec_Email`, `Lec_Password`, `Lec_Status`, `Created_At`) VALUES
(1, 'G.T.Bakyaraj', 'Male', 'System Analysis&Design', '1123456789', 'lecturer1@eamu.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', '2026-02-23 22:10:15'),
(2, 'Nasir Riaz', 'Male', 'Human Resource Management', '1223456789', 'lecturer2@eamu.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', '2026-02-23 22:10:15');

-- --------------------------------------------------------

--
-- Table structure for table `lesson`
--

CREATE TABLE `lesson` (
  `Lesson_ID` int(8) NOT NULL,
  `Lesson_Title` varchar(100) NOT NULL,
  `Lesson_Desc` varchar(500) DEFAULT NULL,
  `Lesson_Video_URL` varchar(500) DEFAULT NULL,
  `Lesson_Duration` varchar(20) DEFAULT NULL,
  `Lesson_Order` int(5) DEFAULT 1,
  `Lesson_Release_Date` date DEFAULT NULL,
  `Course_ID` int(8) NOT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `Notif_ID` int(8) NOT NULL,
  `Notif_Title` varchar(200) NOT NULL,
  `Notif_Desc` varchar(500) DEFAULT NULL,
  `Notif_Type` enum('info','warning','success','danger') DEFAULT 'info',
  `Is_Read` tinyint(1) DEFAULT 0,
  `Recipient_Type` enum('student','lecturer','admin','all') DEFAULT 'all',
  `Recipient_ID` int(8) DEFAULT NULL,
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `progress`
--

CREATE TABLE `progress` (
  `Progress_ID` int(8) NOT NULL,
  `Stu_ID` int(8) NOT NULL,
  `Lesson_ID` int(8) NOT NULL,
  `Course_ID` int(8) NOT NULL,
  `Status` enum('not_started','in_progress','completed') DEFAULT 'not_started',
  `Completed_Date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `question`
--

CREATE TABLE `question` (
  `Question_ID` int(8) NOT NULL,
  `Question_Title` varchar(500) NOT NULL,
  `Question_Desc` varchar(500) DEFAULT NULL,
  `Question_Release_Date` date DEFAULT NULL,
  `Question_Points` int(5) DEFAULT 1,
  `Assign_ID` int(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `question_option`
--

CREATE TABLE `question_option` (
  `Option_ID` int(8) NOT NULL,
  `Option_Text` varchar(500) NOT NULL,
  `Is_Correct` tinyint(1) DEFAULT 0,
  `Question_ID` int(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE `student` (
  `Stu_ID` int(8) NOT NULL,
  `Stu_Name` varchar(100) NOT NULL,
  `Stu_Gender` varchar(10) DEFAULT NULL,
  `Stu_Major` varchar(100) DEFAULT NULL,
  `Stu_Year` int(1) DEFAULT NULL,
  `Stu_DOB` date DEFAULT NULL,
  `Stu_Phone` varchar(20) DEFAULT NULL,
  `Stu_Email` varchar(100) NOT NULL,
  `Stu_Password` varchar(255) NOT NULL,
  `Stu_Status` enum('active','inactive') DEFAULT 'active',
  `Created_At` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student`
--

INSERT INTO `student` (`Stu_ID`, `Stu_Name`, `Stu_Gender`, `Stu_Major`, `Stu_Year`, `Stu_DOB`, `Stu_Phone`, `Stu_Email`, `Stu_Password`, `Stu_Status`, `Created_At`) VALUES
(1, 'Teang_Vong_Sarith', 'Male', 'Business_Information_System', 3, '2006-11-11', '093442987', 'sarith1@edu.com', '$2y$10$mHAtyjSeBTP9D33MIy6O2.fKasDBiWIjHJJ4K130PHT.kaWl1ZxLO', 'active', '2026-02-23 22:03:38'),
(2, 'Ko_Anvey', 'Male', 'Business_Information_System', 3, '2005-10-03', '0715555403', 'anvey1@edu.com', '$2y$10$mHAtyjSeBTP9D33MIy6O2.fKasDBiWIjHJJ4K130PHT.kaWl1ZxLO', 'active', '2026-02-23 22:03:38');

-- --------------------------------------------------------

--
-- Table structure for table `submission`
--

CREATE TABLE `submission` (
  `Subm_ID` int(8) NOT NULL,
  `Subm_Title` varchar(100) DEFAULT NULL,
  `Subm_File` varchar(500) DEFAULT NULL,
  `Subm_Date` datetime DEFAULT current_timestamp(),
  `Subm_Score` decimal(5,2) DEFAULT NULL,
  `Subm_Status` enum('submitted','graded','late') DEFAULT 'submitted',
  `Stu_ID` int(8) NOT NULL,
  `Assign_ID` int(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`Admin_ID`),
  ADD UNIQUE KEY `Admin_Email` (`Admin_Email`);

--
-- Indexes for table `answer`
--
ALTER TABLE `answer`
  ADD PRIMARY KEY (`Answer_ID`),
  ADD KEY `Subm_ID` (`Subm_ID`),
  ADD KEY `Question_ID` (`Question_ID`),
  ADD KEY `Option_ID` (`Option_ID`);

--
-- Indexes for table `assignment`
--
ALTER TABLE `assignment`
  ADD PRIMARY KEY (`Assign_ID`),
  ADD KEY `Course_ID` (`Course_ID`);

--
-- Indexes for table `certificate`
--
ALTER TABLE `certificate`
  ADD PRIMARY KEY (`Cert_ID`),
  ADD UNIQUE KEY `Cert_Code` (`Cert_Code`),
  ADD KEY `Stu_ID` (`Stu_ID`),
  ADD KEY `Course_ID` (`Course_ID`);

--
-- Indexes for table `course`
--
ALTER TABLE `course`
  ADD PRIMARY KEY (`Course_ID`),
  ADD KEY `Lec_ID` (`Lec_ID`);

--
-- Indexes for table `enrollment`
--
ALTER TABLE `enrollment`
  ADD PRIMARY KEY (`Enroll_ID`),
  ADD UNIQUE KEY `unique_enrollment` (`Stu_ID`,`Course_ID`),
  ADD KEY `Course_ID` (`Course_ID`);

--
-- Indexes for table `lecturer`
--
ALTER TABLE `lecturer`
  ADD PRIMARY KEY (`Lec_ID`),
  ADD UNIQUE KEY `Lec_Email` (`Lec_Email`);

--
-- Indexes for table `lesson`
--
ALTER TABLE `lesson`
  ADD PRIMARY KEY (`Lesson_ID`),
  ADD KEY `Course_ID` (`Course_ID`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`Notif_ID`);

--
-- Indexes for table `progress`
--
ALTER TABLE `progress`
  ADD PRIMARY KEY (`Progress_ID`),
  ADD UNIQUE KEY `unique_progress` (`Stu_ID`,`Lesson_ID`),
  ADD KEY `Lesson_ID` (`Lesson_ID`),
  ADD KEY `Course_ID` (`Course_ID`);

--
-- Indexes for table `question`
--
ALTER TABLE `question`
  ADD PRIMARY KEY (`Question_ID`),
  ADD KEY `Assign_ID` (`Assign_ID`);

--
-- Indexes for table `question_option`
--
ALTER TABLE `question_option`
  ADD PRIMARY KEY (`Option_ID`),
  ADD KEY `Question_ID` (`Question_ID`);

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`Stu_ID`),
  ADD UNIQUE KEY `Stu_Email` (`Stu_Email`);

--
-- Indexes for table `submission`
--
ALTER TABLE `submission`
  ADD PRIMARY KEY (`Subm_ID`),
  ADD KEY `Stu_ID` (`Stu_ID`),
  ADD KEY `Assign_ID` (`Assign_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `Admin_ID` int(8) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `answer`
--
ALTER TABLE `answer`
  MODIFY `Answer_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment`
--
ALTER TABLE `assignment`
  MODIFY `Assign_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `certificate`
--
ALTER TABLE `certificate`
  MODIFY `Cert_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course`
--
ALTER TABLE `course`
  MODIFY `Course_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `enrollment`
--
ALTER TABLE `enrollment`
  MODIFY `Enroll_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lecturer`
--
ALTER TABLE `lecturer`
  MODIFY `Lec_ID` int(8) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lesson`
--
ALTER TABLE `lesson`
  MODIFY `Lesson_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `Notif_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `progress`
--
ALTER TABLE `progress`
  MODIFY `Progress_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `question`
--
ALTER TABLE `question`
  MODIFY `Question_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `question_option`
--
ALTER TABLE `question_option`
  MODIFY `Option_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student`
--
ALTER TABLE `student`
  MODIFY `Stu_ID` int(8) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `submission`
--
ALTER TABLE `submission`
  MODIFY `Subm_ID` int(8) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `answer`
--
ALTER TABLE `answer`
  ADD CONSTRAINT `answer_ibfk_1` FOREIGN KEY (`Subm_ID`) REFERENCES `submission` (`Subm_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `answer_ibfk_2` FOREIGN KEY (`Question_ID`) REFERENCES `question` (`Question_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `answer_ibfk_3` FOREIGN KEY (`Option_ID`) REFERENCES `question_option` (`Option_ID`) ON DELETE SET NULL;

--
-- Constraints for table `assignment`
--
ALTER TABLE `assignment`
  ADD CONSTRAINT `assignment_ibfk_1` FOREIGN KEY (`Course_ID`) REFERENCES `course` (`Course_ID`) ON DELETE CASCADE;

--
-- Constraints for table `certificate`
--
ALTER TABLE `certificate`
  ADD CONSTRAINT `certificate_ibfk_1` FOREIGN KEY (`Stu_ID`) REFERENCES `student` (`Stu_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `certificate_ibfk_2` FOREIGN KEY (`Course_ID`) REFERENCES `course` (`Course_ID`) ON DELETE CASCADE;

--
-- Constraints for table `course`
--
ALTER TABLE `course`
  ADD CONSTRAINT `course_ibfk_1` FOREIGN KEY (`Lec_ID`) REFERENCES `lecturer` (`Lec_ID`) ON DELETE CASCADE;

--
-- Constraints for table `enrollment`
--
ALTER TABLE `enrollment`
  ADD CONSTRAINT `enrollment_ibfk_1` FOREIGN KEY (`Stu_ID`) REFERENCES `student` (`Stu_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `enrollment_ibfk_2` FOREIGN KEY (`Course_ID`) REFERENCES `course` (`Course_ID`) ON DELETE CASCADE;

--
-- Constraints for table `lesson`
--
ALTER TABLE `lesson`
  ADD CONSTRAINT `lesson_ibfk_1` FOREIGN KEY (`Course_ID`) REFERENCES `course` (`Course_ID`) ON DELETE CASCADE;

--
-- Constraints for table `progress`
--
ALTER TABLE `progress`
  ADD CONSTRAINT `progress_ibfk_1` FOREIGN KEY (`Stu_ID`) REFERENCES `student` (`Stu_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `progress_ibfk_2` FOREIGN KEY (`Lesson_ID`) REFERENCES `lesson` (`Lesson_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `progress_ibfk_3` FOREIGN KEY (`Course_ID`) REFERENCES `course` (`Course_ID`) ON DELETE CASCADE;

--
-- Constraints for table `question`
--
ALTER TABLE `question`
  ADD CONSTRAINT `question_ibfk_1` FOREIGN KEY (`Assign_ID`) REFERENCES `assignment` (`Assign_ID`) ON DELETE CASCADE;

--
-- Constraints for table `question_option`
--
ALTER TABLE `question_option`
  ADD CONSTRAINT `question_option_ibfk_1` FOREIGN KEY (`Question_ID`) REFERENCES `question` (`Question_ID`) ON DELETE CASCADE;

--
-- Constraints for table `submission`
--
ALTER TABLE `submission`
  ADD CONSTRAINT `submission_ibfk_1` FOREIGN KEY (`Stu_ID`) REFERENCES `student` (`Stu_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `submission_ibfk_2` FOREIGN KEY (`Assign_ID`) REFERENCES `assignment` (`Assign_ID`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
