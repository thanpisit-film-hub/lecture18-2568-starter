import { Router, type Request, type Response } from "express";
import { type Student, type Enrollment } from "../libs/types.js";

import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
} from "../libs/zodValidators.js";

// import database
import { students, courses, enrollments } from "../db/db.js";

import type { User, CustomRequest } from "../libs/types.js";
import { authenticateToken } from "../middlewares/authenMiddleware.js";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.js";

// import database
import {
  users,
  reset_users,
  reset_courses,
  reset_enrollments,
  reset_students,
  reset_db,
} from "../db/db.js";
import { success } from "zod";
import { checkRoleAll } from "../middlewares/checkRoleAllMiddleware.js";
import { checkRoleStudent } from "../middlewares/checkRoleStudentMiddleware.js";

const router = Router();

// GET /api/v2/students
// get students (by program)
router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  (req: CustomRequest, res: Response) => {
    try {
      const payload = (req as CustomRequest).user;
      const token = (req as CustomRequest).token;

      const show_data = students.map((x) => ({
        studentId: x.studentId,
        courses: (x.courses ?? []).map((y) => ({ couseId: y })),
      }));

      return res.json({
        success: true,
        message: "Enrollment Information",
        data: show_data,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

router.get(
  "/:studentId",
  authenticateToken,
  checkRoleAll,
  (req: CustomRequest, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const result = zStudentId.safeParse(studentId);

      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const foundIndex = students.findIndex(
        (std: Student) => std.studentId === studentId
      );

      if (foundIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      res.json({
        success: true,
        data: students[foundIndex],
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

router.post(
  "/:studentId",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const body = req.body;
      const _student = req.body.studentId;
      const result = zStudentId.safeParse(_student);

      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

        const customReq = req as CustomRequest;
        if (req.params.studentId !== customReq.user?.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }



      const isduplicate = enrollments.filter(
        (x) =>
          x.studentId === req.params.studentId && x.courseId === body.courseId
      );
      if (isduplicate) {
        return res.status(409).json({
          success: false,
          message: `studentId ${_student} && courseId ${body.courseId} is already exists`,
        });
      }

      const new_Enrollment: Enrollment = {
        studentId: _student,
        courseId: body.courseId,
      };
      enrollments.push(new_Enrollment);

      return res.status(201).json({
        success: true,
        message: `Student ${_student} && Course ${body.courseId} has been added`,
        data: new_Enrollment,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

router.post("/reset", (req: Request, res: Response) => {
  try {
    reset_db();
    reset_courses();
    reset_enrollments();
    reset_students();
    reset_users();
    return res.status(200).json({
      success: true,
      message: "enrollment database has been reset",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

router.delete(
  "/:studentId",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const body = req.body;
      const parseResult = zStudentId.safeParse(body.studentId);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          error: parseResult.error.issues[0]?.message,
        });
      }

      const customReq = req as CustomRequest;
      if (customReq.user?.studentId !== body.studentId) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to modify another student's data",
        });
      }



      const foundIndex = students.findIndex(
        (std: Student) => std.studentId === body.studentId
      );

      if (foundIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Enrollment does not exists",
        });
      }

      // delete found student from array
      students.splice(foundIndex, 1);

      res.status(200).json({
        success: true,
        message: `Student ${req.params.studentId} && Course ${req.body.courseId} has been deleted successfully`,
        data: enrollments
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Somthing is wrong, please try again",
        error: err,
      });
    }
  }
);

export default router;
