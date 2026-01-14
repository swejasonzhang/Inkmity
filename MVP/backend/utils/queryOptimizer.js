import { measureQuery } from "../middleware/performance.js";

export const queryOptimizer = {
  parseExperience(exp) {
    const s = String(exp || "").trim().toLowerCase();
    if (!s || s === "all") return {};

    if (s.endsWith("+")) {
      const n = Number(s.slice(0, -1));
      return Number.isFinite(n) ? { $gte: n } : {};
    }

    const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return { $gte: a, $lte: b };
      }
    }

    return {};
  },

  buildTextSearch(search) {
    if (!search || !search.trim()) return {};

    const cleaned = search.trim();
    if (cleaned.length < 2) return {};

    const escaped = cleaned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");

    return {
      $or: [
        { username: rx },
        { bio: rx },
        { location: rx },
        { styles: rx },
      ],
    };
  },

  buildPagination(page = 1, pageSize = 12, maxPageSize = 100) {
    const validPage = Math.max(1, Number(page) || 1);
    const validPageSize = Math.max(1, Math.min(maxPageSize, Number(pageSize) || 12));

    return {
      skip: (validPage - 1) * validPageSize,
      limit: validPageSize,
      page: validPage,
      pageSize: validPageSize,
    };
  },

  async executeWithMeasure(queryName, queryFn) {
    return await measureQuery(queryName, queryFn);
  },

  buildSort(sortKey = "rating_desc") {
    const sortMap = {
      rating_desc: { rating: -1, reviewsCount: -1, createdAt: -1 },
      rating_asc: { rating: 1, reviewsCount: -1 },
      experience_desc: { yearsExperience: -1, rating: -1 },
      experience_asc: { yearsExperience: 1, rating: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };

    return sortMap[sortKey] || sortMap.rating_desc;
  },

  buildDateRange(startDate, endDate, field = "startAt") {
    if (!startDate && !endDate) return {};

    const query = {};
    if (startDate) {
      query[field] = { ...(query[field] || {}), $gte: new Date(startDate) };
    }
    if (endDate) {
      query[field] = { ...(query[field] || {}), $lte: new Date(endDate) };
    }

    return query;
  },

  selectFields(fields) {
    return fields.join(" ");
  },
};
