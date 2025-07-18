import response from "../utils/response.js";
import constants from '../utils/constants.js';
import orderMdl from '../model/orderModel.js';
const { orderModel } = orderMdl;
const { resStatusCode, resMessage } = constants;

export async function getHomePage(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 6);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 29);

    const isCustomFilter = startDate && endDate;
    const customStart = isCustomFilter ? new Date(startDate) : null;
    const customEnd = isCustomFilter ? new Date(endDate) : null;

    const createdAtFilter = isCustomFilter
      ? { createdAt: { $gte: customStart, $lte: customEnd } }
      : {};

    const buildDailySales = async (fromDate, toDate) => {
      const data = await orderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%dT00:00:00.000Z",
                date: "$createdAt",
              },
            },
            transaction: { $sum: "$totalAmount" },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const map = new Map(
        data.map((d) => [
          d._id,
          { transaction: d.transaction, totalOrders: d.totalOrders },
        ]),
      );

      const result = [];
      let cursor = new Date(fromDate);
      cursor.setHours(0, 0, 0, 0);
      const end = new Date(toDate);
      end.setHours(0, 0, 0, 0);

      while (cursor <= end) {
        const iso = cursor.toISOString();
        const key = iso.slice(0, 10) + 'T00:00:00.000Z';
        const entry = map.get(key) || { transaction: 0, totalOrders: 0 };
        result.push({ date: iso, ...entry });
        cursor.setDate(cursor.getDate() + 1);
      };

      return result;
    };

    const countsPromise = orderModel.aggregate([
      { $match: createdAtFilter },
      {
        $facet: {
          totalOrders: [{ $count: "count" }],
          activeOrders: [
            { $match: { status: { $in: ["Processing", "Shipped"] } } },
            { $count: "count" },
          ],
          completedOrders: [
            { $match: { status: "completed" } },
            { $count: "count" },
          ],
          returnedOrders: [
            { $match: { status: "Cancelled" } },
            { $count: "count" },
          ],
        },
      },
      {
        $project: {
          totalOrders: { $arrayElemAt: ["$totalOrders.count", 0] },
          activeOrders: { $arrayElemAt: ["$activeOrders.count", 0] },
          completedOrders: { $arrayElemAt: ["$completedOrders.count", 0] },
          returnedOrders: { $arrayElemAt: ["$returnedOrders.count", 0] },
        },
      },
    ]);

    const [
      counts,
      todaySalesGraph,
      weekSalesGraph,
      monthSalesGraph,
      customSalesGraph,
    ] = await Promise.all([
      countsPromise,
      buildDailySales(startOfToday, now),
      buildDailySales(oneWeekAgo, now),
      buildDailySales(oneMonthAgo, now),
      isCustomFilter ? buildDailySales(customStart, customEnd) : [],
    ]);
    const stats = {
      totalOrders: counts[0]?.totalOrders || 0,
      activeOrders: counts[0]?.activeOrders || 0,
      completedOrders: counts[0]?.completedOrders || 0,
      returnedOrders: counts[0]?.returnedOrders || 0,
      today: todaySalesGraph,
      lastWeek: weekSalesGraph,
      lastMonth: monthSalesGraph,
      customRange: isCustomFilter ? customSalesGraph : [],
    };
    return response.success(res, req?.languageCode, resStatusCode.ACTION_COMPLETE, resMessage.DATA_FETCHED_SUCCESSFULLY, stats);
  } catch (error) {
    console.error(error);
    return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, error);
  };
};

export async function exportHomePageCSV(req, res) {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};
    let fromDate, toDate;
    if (startDate && endDate) {
      fromDate = new Date(startDate);
      fromDate.setHours(0, 0, 0, 0);

      toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);

      matchStage = {
        createdAt: { $gte: fromDate, $lte: toDate },
      };
    };
    const data = await orderModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0],
            },
          },
          processingOrders: {
            $sum: {
              $cond: [{ $in: ["$status", ["Processing", "Shipped"]] }, 1, 0],
            },
          },
          totalTransaction: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const map = new Map(data.map(d => [d._id, d]));
    const result = [];
    if (fromDate && toDate) {
      let cursor = new Date(fromDate);
      const end = new Date(toDate);
      cursor.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        const dateKey = cursor.toISOString().slice(0, 10);
        const entry = map.get(dateKey) || {
          totalOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          processingOrders: 0,
          totalTransaction: 0,
        };
        result.push({
          date: dateKey,
          totalOrders: entry.totalOrders,
          completedOrders: entry.completedOrders,
          cancelledOrders: entry.cancelledOrders,
          processingOrders: entry.processingOrders,
          totalTransaction: entry.totalTransaction.toFixed(2),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      data.forEach(entry => {
        result.push({
          date: entry._id,
          totalOrders: entry.totalOrders,
          completedOrders: entry.completedOrders,
          cancelledOrders: entry.cancelledOrders,
          processingOrders: entry.processingOrders,
          totalTransaction: entry.totalTransaction.toFixed(2),
        });
      });
    };
    const pad = (str, len) => str.toString().padEnd(len, ' ');

    let table =
      pad('Date', 12) +
      pad('Total Orders', 15) +
      pad('Completed', 12) +
      pad('Cancelled', 12) +
      pad('Processing', 12) +
      pad('Total Transaction', 18) +
      '\n';
    table += '-'.repeat(81) + '\n';

    for (const row of result) {
      table +=
        pad(row.date, 12) +
        pad(row.totalOrders, 15) +
        pad(row.completedOrders, 12) +
        pad(row.cancelledOrders, 12) +
        pad(row.processingOrders, 12) +
        pad(row.totalTransaction, 18) +
        '\n';
    };
    res.setHeader('Content-Disposition', `attachment; filename=home_sales_report.txt`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(table);

  } catch (error) {
    console.error("CSV export error:", error);
    return response.error(res, req?.languageCode, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, error);
  };
};
